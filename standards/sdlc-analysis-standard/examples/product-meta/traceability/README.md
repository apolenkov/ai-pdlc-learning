# Traceability

Record links without duplicating system-owned state.

| Relationship | Required owner |
| --- | --- |
| Jira issue -> accepted product change | Analyst author |
| Product change -> affected service changes | Architect or developer reviewer |
| Service merge request -> implementation evidence | Service owner |
| Accepted Git state -> Confluence mirror | Publication automation |

OpenSpec archive is an implementation follow-up. It is not a prerequisite for analysis readiness and does not prove deployment or business effect.
