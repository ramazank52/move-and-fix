# P33 Native AR Adapter Research

**Classification:** `CODE_READY_NOT_PHYSICALLY_VERIFIED` for the adapter boundary; `EXTERNAL_BLOCKER` for AR accuracy and device support evidence.

The current project does **not** contain `expo-camera` in its dependency graph. Expo Camera documents camera preview, still capture, permission handling and a config plugin, but it does not document AR plane/depth measurement APIs. It is therefore not a truthful AR measurement adapter by itself. [1]

A React Native AR renderer vendor documents ARKit/ARCore plane support through a development build rather than Expo Go and requires a physical device for AR verification. This establishes an integration candidate only; it does not establish compatibility with this repository's exact Expo/React Native versions, measurement accuracy, or permission/tracking behavior. No dependency or config plugin has been added from that claim. [2]

The canonical runtime contract remains fail-closed: web and missing native adapter use manual measurement, a native adapter may return only `AR_READY` after availability, permission and tracking checks, and all other states direct the user to the manual fallback. Raw camera media, AR mesh data and sensor samples are not persisted by the measurement contract.

| Evidence item | Status |
|---|---|
| Manual rectangle/polygon geometry core | `CODE_READY` |
| Native adapter interface/capability boundary | `CODE_READY_NOT_PHYSICALLY_VERIFIED` |
| Exact third-party AR dependency compatibility | `EXTERNAL_BLOCKER` pending isolated development-build validation |
| iOS AR accuracy on measured reference surface | `EXTERNAL_BLOCKER` |
| Android AR accuracy on measured reference surface | `EXTERNAL_BLOCKER` |

## References

[1]: https://docs.expo.dev/versions/latest/sdk/camera/ "Expo Camera documentation"
[2]: https://www.reactvision.xyz/expo-ar/ "ReactVision Expo AR overview"
