# P30 Legacy Source Reconciliation

**Canonical baseline:** `b97d81d` (checkpoint `b97d81de`)  
**Working-tree condition at inspection:** only `todo.md` modified for P30 tracking.  
**Decision:** Current canonical repository remains the sole implementation source of truth.

## Attachment availability

The P30 command refers to `MOVEFIX_ABF555F3_COMPLETE_SOURCE.zip` and `MOVEFIX_MASTER_KAPATMA_TALIMATI.md`. A read-only inventory of `/home/ubuntu/upload` found neither filename. No archive was extracted, restored, merged, or treated as canonical.

| Requested comparison input | Availability | Action taken |
|---|---|---|
| `MOVEFIX_ABF555F3_COMPLETE_SOURCE.zip` | NOT_AVAILABLE | No restore, checkout, or file overwrite. |
| `MOVEFIX_MASTER_KAPATMA_TALIMATI.md` | NOT_AVAILABLE | P30 user-message superseding constraints remain the available instruction source. |
| Current canonical tree | AVAILABLE | Continue from `b97d81d`, preserving subsequent P28/P29 source changes. |

## Safety conclusion

The unavailable legacy archive is recorded as `EXTERNAL_ARTIFACT_UNAVAILABLE`. It does not authorize reverting the active tree, weakening current gates, or fabricating a historical diff. Outbox, capacity, lifecycle, country gates, migration candidates, external credential boundaries, and no-publish rules remain governed by the current canonical source and the user’s explicit P30 constraints.
