# P28 — Camera Measurement Capability Status

**Assessment date:** 2026-08-25  
**Source examined:** local Expo SDK 54 `media/camera/DOCS.md`  
**Status:** `CODE_READY_NOT_PHYSICALLY_VERIFIED`

The local Expo Camera module documents camera preview, camera permission, picture capture, video recording and barcode scanning. It does not document an AR plane, depth, room-mesh, or metrology API. Therefore, this source cannot support a claim that the managed Expo application has a real AR/Depth m² adapter.

| Capability | Source-supported status | Product behavior required |
|---|---|---|
| Camera permission / preview | Supported on iOS, Android and web | Request permission only when user initiates camera measurement. |
| AR plane/depth m² measurement | Not evidenced by the installed Expo Camera contract | Never fabricate an AR result. Return `NOT_SUPPORTED`/manual fallback until a verified native adapter is configured and physically validated. |
| Manual rectangle/polygon m² measurement | Internal source implementation | Canonical geometry validation, units, confidence warning and owner-scoped attachment can be tested without hardware. |
| Physical AR accuracy | External physical-device gate | Requires supported iOS and Android devices plus known reference surfaces; simulators/mocks do not count. |

No captured image, AR mesh or room scan is necessary for manual measurement and none will be uploaded by the measurement flow. Camera capture remains a separate consented media path subject to existing upload/quarantine controls.

## Reference

[1]: Local Expo SDK 54 Camera documentation — `/home/ubuntu/move-and-fix_helper/docs/media/camera/DOCS.md`.
