/**
 * SCAFFOLD: not deployed, not run. Triggered by SQS when the web app accepts a guest request.
 * It stores a RECOMMENDATION on the request row; it never creates tasks or contacts the guest.
 */
import type { SQSEvent, SQSBatchResponse } from "aws-lambda";
import { classifyRequest } from "../../src/lib/bedrock";
import { db } from "./db";

interface Message { requestId: string; propertyId: string }

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const failures: SQSBatchResponse["batchItemFailures"] = [];
  const pool = await db();
  for (const rec of event.Records) {
    try {
      const { requestId, propertyId } = JSON.parse(rec.body) as Message;
      const { rows: [req] } = await pool.query("SELECT message, guest_name, vip FROM guest_requests WHERE id = $1 AND property_id = $2 AND status = 'new'", [requestId, propertyId]);
      if (!req) continue; // already handled or not found: acknowledge
      const { rows: ruleRows } = await pool.query("SELECT * FROM routing_rules WHERE property_id = $1", [propertyId]);
      const rules = ruleRows.map((r) => ({
        id: r.id, name: r.name, enabled: r.enabled, description: r.description, keywords: r.keywords, category: r.category,
        department: r.department, priority: r.priority, action: r.action, slaMinutes: r.sla_minutes,
        suggestEscalation: r.suggest_escalation, safetyCritical: r.safety_critical,
      }));
      const c = await classifyRequest({ message: req.message, guestName: req.guest_name, vip: req.vip }, rules, { vipPriorityBump: true, minConfidenceToRecommend: 0.6, requireStaffApproval: true });
      await pool.query(
        `UPDATE guest_requests SET ai_rule_id=$2, ai_department=$3, ai_priority=$4, ai_confidence=$5, ai_source=$6, ai_payload=$7, ai_model_id=$8 WHERE id=$1`,
        [requestId, c.ruleId, c.department, c.priority, c.confidence, c.source, c, process.env.BEDROCK_MODEL_ID ?? null],
      );
      await pool.query("INSERT INTO audit_log (actor_label, action, target_type, target_id, detail) VALUES ('system:lambda:classify','classify','guest_request',$1,$2)", [requestId, `Recommended ${c.department}/${c.priority} via ${c.source}`]);
    } catch (err) {
      console.error("classify failed", rec.messageId, err instanceof Error ? err.message : err);
      failures.push({ itemIdentifier: rec.messageId }); // retried, then sent to the DLQ
    }
  }
  return { batchItemFailures: failures };
};
