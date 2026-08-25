/** Production runtime language set. Unsupported legacy locale codes must fall back to Turkish. */
export type Language = "tr" | "en" | "de" | "fr" | "ar" | "ru" | "zh" | "hi" | "es" | "pt" | "bn" | "id" | "ja";
import type { SupportedDisplayCurrency } from "@/shared/currency-policy";

export type SupportedCurrency = SupportedDisplayCurrency;

export const LANGUAGES: { code: Language; name: string; nativeName: string; locale: string; isRTL: boolean }[] = [
  { code: "tr", name: "Turkish", nativeName: "Türkçe", locale: "tr-TR", isRTL: false },
  { code: "en", name: "English", nativeName: "English", locale: "en-US", isRTL: false },
  { code: "de", name: "German", nativeName: "Deutsch", locale: "de-DE", isRTL: false },
  { code: "fr", name: "French", nativeName: "Français", locale: "fr-FR", isRTL: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", locale: "ar", isRTL: true },
  { code: "ru", name: "Russian", nativeName: "Русский", locale: "ru-RU", isRTL: false },
  { code: "zh", name: "Chinese", nativeName: "中文", locale: "zh-CN", isRTL: false },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", locale: "hi-IN", isRTL: false },
  { code: "es", name: "Spanish", nativeName: "Español", locale: "es-ES", isRTL: false },
  { code: "pt", name: "Portuguese", nativeName: "Português", locale: "pt-PT", isRTL: false },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", locale: "bn-BD", isRTL: false },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", locale: "id-ID", isRTL: false },
  { code: "ja", name: "Japanese", nativeName: "日本語", locale: "ja-JP", isRTL: false },
];

export const SUPPORTED_CURRENCIES: { code: SupportedCurrency; label: string; locale: string }[] = [
  { code: "TRY", label: "Türk lirası (TRY)", locale: "tr-TR" },
  { code: "USD", label: "US dollar (USD)", locale: "en-US" },
  { code: "EUR", label: "Euro (EUR)", locale: "de-DE" },
];

type ProviderOnboardingTranslationKey =
  | "provider.onboarding.backAccessibility" | "provider.onboarding.title" | "provider.onboarding.subtitle"
  | "provider.onboarding.loadErrorTitle" | "provider.onboarding.retry" | "provider.onboarding.setupSavedTitle"
  | "provider.onboarding.setupSavedBody" | "provider.onboarding.setupFailedTitle" | "provider.onboarding.setupFailedBody"
  | "provider.onboarding.activationStatus" | "provider.onboarding.activationEligible" | "provider.onboarding.activationBlocked"
  | "provider.onboarding.step.profile" | "provider.onboarding.step.serviceScope" | "provider.onboarding.step.jurisdiction"
  | "provider.onboarding.step.capability" | "provider.onboarding.step.credentials" | "provider.onboarding.step.documents"
  | "provider.onboarding.step.launchGate" | "provider.onboarding.scope.title" | "provider.onboarding.scope.help"
  | "provider.onboarding.category" | "provider.onboarding.subcategory" | "provider.onboarding.selectCategoryScope"
  | "provider.onboarding.categoryScopeHelp" | "provider.onboarding.capabilityScope" | "provider.onboarding.noCapability"
  | "provider.onboarding.saveScope" | "provider.onboarding.openDocuments" | "provider.onboarding.openDocumentsHint"
  | "provider.onboarding.emptyOptions" | "provider.onboarding.status.complete" | "provider.onboarding.status.selected"
  | "provider.onboarding.status.verified" | "provider.onboarding.status.approved" | "provider.onboarding.status.eligible"
  | "provider.onboarding.status.blocked" | "provider.onboarding.status.pending" | "provider.onboarding.status.missing"
  | "provider.onboarding.status.unknown" | "provider.onboarding.dashboardCtaTitle" | "provider.onboarding.dashboardCtaBody"
  | "provider.onboarding.country" | "provider.onboarding.countryLoading" | "provider.onboarding.countryUnavailable"
  | "provider.onboarding.countryAvailable" | "provider.onboarding.countryComingSoon" | "provider.onboarding.countryBlocked";

type ProfileEditTranslationKey =
  | "profile.edit.backAccessibility" | "profile.edit.title" | "profile.edit.name" | "profile.edit.email"
  | "profile.edit.phone" | "profile.edit.saveAccessibility" | "profile.edit.save" | "profile.edit.verificationRequiredTitle"
  | "profile.edit.verificationRequiredBody" | "profile.edit.verifyNow" | "profile.edit.updatedTitle"
  | "profile.edit.updatedBody" | "profile.edit.done" | "profile.edit.updateFailedTitle" | "profile.edit.updateFailedBody"
  | "profile.edit.phoneVerificationRequiredTitle" | "profile.edit.phoneVerificationRequiredBody"
  | "profile.edit.pendingEmail" | "profile.edit.pendingPhone" | "profile.edit.pendingVerifyNow";

type P17ClosureTranslationKey =
  | "organization.title" | "organization.subtitle" | "organization.none" | "organization.sites" | "organization.assets"
  | "organization.schedules" | "organization.batches" | "organization.invoices" | "organization.loading" | "organization.noSites"
  | "organization.noAssets" | "organization.noSchedules" | "organization.noBatches" | "organization.noInvoices" | "organization.error"
  | "provider.documents.backAccessibility" | "provider.documents.title" | "provider.documents.secureUploadTitle" | "provider.documents.secureUploadBody"
  | "provider.documents.requirementsLoading" | "provider.documents.requirementsUnavailable" | "provider.documents.requirementsUnavailableBody" | "provider.documents.retry"
  | "provider.documents.uploadDisabled" | "provider.documents.uploadDisabledBody" | "provider.documents.receivedTitle" | "provider.documents.receivedBody"
  | "provider.documents.uploadFailedTitle" | "provider.documents.unsupportedTitle" | "provider.documents.unsupportedBody" | "provider.documents.fileTooLargeTitle"
  | "provider.documents.fileTooLargeBody" | "provider.documents.readFailedTitle" | "provider.documents.readFailedBody" | "provider.documents.upload" | "provider.documents.update"
  | "provider.documents.uploading" | "provider.documents.notUploaded" | "provider.documents.approved" | "provider.documents.rejected" | "provider.documents.pendingReview"
  | "provider.documents.scopeReviewTitle" | "provider.documents.scopeReviewBody" | "provider.documents.scopeCapabilitiesTitle" | "provider.documents.scopeCapabilitiesBody"
  | "provider.documents.workingModel" | "provider.documents.assurance" | "provider.documents.status" | "provider.documents.statusRequired"
  | "provider.documents.statusConditional" | "provider.documents.statusProhibited" | "provider.documents.statusNotRequired" | "provider.documents.statusLegalReview" | "provider.documents.humanReview"
  | "ai.policy.safetyBlocked" | "ai.policy.safetySuggestion" | "ai.policy.contactSupportSuggestion" | "ai.policy.draftCreated" | "ai.policy.reviewDraft"
  | "ai.policy.addDetail" | "ai.policy.confirmDraft" | "ai.policy.needDetails" | "ai.policy.specifyService" | "ai.policy.addLocation" | "ai.policy.shareTiming";

export type TranslationKey =
  | "home" | "explore" | "myJobs" | "messages" | "profile" | "search" | "categories" | "topRated" | "viewAll"
  | "serviceRequest" | "findProvider" | "login" | "register" | "logout" | "settings" | "premium" | "notifications"
  | "aiAssistant" | "active" | "pending" | "completed" | "cancelled" | "language" | "currency" | "wallet" | "restartRequired"
  | "settingsSecurity" | "darkMode" | "activeDevices" | "about" | "privacyPolicy" | "terms" | "logoutConfirmTitle"
  | "logoutConfirmBody" | "cancel" | "currencyTry" | "currencyUsd" | "currencyEur" | "currencyUnavailableTitle" | "currencyUnavailableBody" | "currencySettlementNotice" | "version" | "languageSelectionHelp" | "back" | "security"
  | "consent.title" | "consent.requiredHint" | "consent.readText" | "consent.createAccount" | "consent.acceptAll"
  | "privacy.title" | "privacy.updated" | "privacy.publicDescription" | "privacy.publicNotice" | "privacy.approvedText" | "privacy.pendingLegalReviewTitle" | "privacy.pendingLegalReviewBody" | "privacy.tabAccessibility" | "privacy.tabHint"
  | "home.greeting" | "home.defaultName" | "home.subtitle" | "home.searchPlaceholder" | "home.moveAITitle"
  | "home.moveAISubtitle" | "home.quickAccess" | "home.activeJob" | "home.nearbyProviders" | "home.popularServices"
  | "home.noNearbyProviders" | "home.quickAccess_emergency" | "home.quickAccess_vehicle" | "home.quickAccess_home"
  | "home.quickAccess_moving" | "home.service.cleaning" | "home.service.plumbing" | "home.service.electricity"
  | "home.service.airConditioning" | "home.serviceCount" | "common.seeAll"
  | "explore.title" | "explore.all" | "explore.emergency" | "explore.vehicle" | "explore.loadingServices"
  | "explore.categoriesFailed" | "explore.retry" | "explore.noServices" | "explore.recommendedProviders"
  | "explore.loadingProvidersFailed" | "explore.noProviders" | "explore.providerCount" | "explore.moveScore"
  | "ai.welcome" | "ai.online" | "ai.thinking" | "ai.inputPlaceholder" | "ai.fallback"
  | "ai.requestCreatedTitle" | "ai.requestCreatedBody" | "ai.later" | "ai.viewProviders" | "ai.draftReady" | "ai.confirmDraft" | "ai.confirmingDraft" | "ai.chooseCountry" | "ai.countryUnavailable" | "ai.countryLoading"
  | "ai.prompt.plumbing" | "ai.prompt.roadside" | "ai.prompt.airConditioning" | "ai.prompt.towTruck"
  | "ai.prompt.courier" | "ai.prompt.priceEstimate"
  | "wallet.loading" | "wallet.loadFailedTitle" | "wallet.loadFailedBody" | "wallet.retry" | "wallet.retryAccessibility"
  | "wallet.historyAccessibility" | "wallet.balance" | "wallet.pendingEscrow" | "wallet.addMoney" | "wallet.withdraw"
  | "wallet.history" | "wallet.recentTransactions" | "wallet.allTransactionsAccessibility" | "wallet.emptyTitle" | "wallet.emptyBody"
  | "profile.defaultName" | "profile.defaultMember" | "profile.reviewCount" | "profile.personalInfo" | "profile.addresses"
  | "profile.paymentMethods" | "profile.favorites" | "profile.pastJobs" | "profile.settingsSecurity"
  | "checkout.invalidLink" | "checkout.invalidLinkBody" | "checkout.loadingQuote" | "checkout.quoteUnavailable"
  | "checkout.serviceSummary" | "checkout.provider" | "checkout.total" | "checkout.escrowGuarantee" | "checkout.feeBreakdown" | "checkout.priceGuaranteeTitle" | "checkout.priceGuaranteeBody" | "checkout.priceGuaranteeMaximum"
  | "checkout.serviceFee" | "checkout.platformCommission" | "checkout.commissionInfo" | "checkout.totalPayable" | "checkout.paymentMethod"
  | "checkout.walletVerifying" | "checkout.walletUnavailable" | "checkout.walletAvailable" | "checkout.walletBlocked"
  | "checkout.iyzicoSubtitle" | "checkout.stripeReady" | "checkout.stripeBlocked" | "checkout.billingInfo" | "checkout.billingInfoBody"
  | "checkout.phonePlaceholder" | "checkout.identityPlaceholder" | "checkout.addressPlaceholder" | "checkout.cityPlaceholder" | "checkout.zipPlaceholder"
  | "checkout.securityNotice" | "checkout.title" | "checkout.processing" | "checkout.payWith"
  | "provider.dashboardLoading" | "provider.dashboardUnavailable" | "provider.dashboardUnavailableBody" | "provider.today"
  | "provider.todayEarnings" | "provider.totalEarnings" | "provider.activeJobs" | "provider.newOffers" | "provider.availability" | "provider.cockpitTitle" | "provider.pendingPayments" | "provider.averageRating" | "provider.cancellationRate" | "provider.metricUnavailable"
  | "provider.available" | "provider.unavailable" | "provider.menuNewJobs" | "provider.menuActiveJobs" | "provider.menuCalendar"
  | "provider.menuEarnings" | "provider.menuMessages" | "provider.menuProfile"
  | "messages.title" | "messages.subtitle" | "messages.loading" | "messages.errorTitle" | "messages.errorBody" | "messages.retry"
  | "messages.emptyTitle" | "messages.emptyBody"
  | "tracking.timeline.scheduled" | "tracking.timeline.onTheWay" | "tracking.timeline.arrived" | "tracking.timeline.inProgress" | "tracking.timeline.completed"
  | "tracking.action.depart" | "tracking.action.arrived" | "tracking.action.start" | "tracking.action.complete"
  | "tracking.status.scheduledTitle" | "tracking.status.scheduledSubtitle" | "tracking.status.onTheWayTitle" | "tracking.status.onTheWaySubtitle" | "tracking.status.etaSubtitle"
  | "tracking.status.arrivedTitle" | "tracking.status.arrivedSubtitle" | "tracking.status.inProgressTitle" | "tracking.status.inProgressSubtitle" | "tracking.status.completedTitle" | "tracking.status.completedSubtitle" | "tracking.status.cancelledTitle" | "tracking.status.cancelledSubtitle"
  | "tracking.invalidLinkTitle" | "tracking.invalidLinkBody" | "tracking.back" | "tracking.loading" | "tracking.accessErrorTitle" | "tracking.accessErrorBody" | "tracking.retry"
  | "tracking.headerTitle" | "tracking.minuteShort" | "tracking.providerFallback" | "tracking.serviceFallback" | "tracking.noLocation" | "tracking.locationUnknown" | "tracking.lastUpdated" | "tracking.jobsCount"
  | "tracking.messagingUnavailable" | "tracking.messagingUnavailableBody" | "tracking.serviceDetail" | "tracking.service" | "tracking.address" | "tracking.addressMissing" | "tracking.jobStatus"
  | "tracking.proofTitle" | "tracking.proofHint" | "tracking.aiDisclosure" | "tracking.proofPlaceholder" | "tracking.addProofMedia" | "tracking.submitProof" | "tracking.proofStatus" | "tracking.proofDisputed" | "tracking.proofExpired" | "tracking.proofRespond" | "tracking.proofRecorded"
  | "tracking.aiNote" | "tracking.aiConfidence" | "tracking.aiDecisionDisclosure" | "tracking.approveJob" | "tracking.createDispute" | "tracking.disputePlaceholder" | "tracking.submitDispute" | "tracking.stopSharing" | "tracking.shareLocation" | "tracking.reviewService"
  | "jobs.filter.active" | "jobs.filter.offers" | "jobs.filter.scheduled" | "jobs.filter.completed"
  | "jobs.status.offers" | "jobs.status.scheduled" | "jobs.status.onTheWay" | "jobs.status.arrived" | "jobs.status.inProgress" | "jobs.status.completed" | "jobs.status.cancelled"
  | "jobs.action.viewOffers" | "jobs.action.track" | "jobs.action.viewDetail" | "jobs.serviceFallback" | "jobs.provider" | "jobs.minuteShort" | "jobs.chatAccessibility"
  | "jobs.acceptedOffer" | "jobs.budget" | "jobs.waitingOffer" | "jobs.title" | "jobs.subtitle" | "jobs.loading" | "jobs.errorTitle" | "jobs.retry" | "jobs.emptyTitle" | "jobs.emptyBody" | "jobs.newRequest"
  | "chat.providerFallback" | "chat.providerMeta" | "chat.userMeta" | "chat.invalidContext" | "chat.loading" | "chat.loadError" | "chat.emptyTitle" | "chat.emptyBody" | "chat.sendError" | "chat.voiceSendError" | "chat.placeholder" | "chat.stopRecordAndSend" | "chat.recordVoice" | "chat.translate" | "chat.showOriginal" | "chat.showTranslation" | "chat.hideForMe" | "chat.translationUnavailable" | "chat.hidden" | "chat.autoTranslateTitle" | "chat.autoTranslateBody" | "chat.autoTranslateEnabled" | "chat.autoTranslateDisabled" | "chat.autoTranslateSaveError" | "chat.backAccessibility" | "chat.inputHint" | "chat.expenseFile" | "chat.expenseFileAccessibility" | "chat.expenseFileHint"
  | "opportunities.offerSentTitle" | "opportunities.offerSentBody" | "opportunities.offerFailedTitle" | "opportunities.retry" | "opportunities.profileRequiredTitle" | "opportunities.profileRequiredBody" | "opportunities.invalidAmountTitle" | "opportunities.invalidAmountBody" | "opportunities.durationRequiredTitle" | "opportunities.durationRequiredBody"
  | "opportunities.loading" | "opportunities.errorTitle" | "opportunities.errorBody" | "opportunities.title" | "opportunities.emptyTitle" | "opportunities.emptyBody" | "opportunities.serviceFallback" | "opportunities.locationMissing" | "opportunities.customerBudget" | "opportunities.openForOffer" | "opportunities.close" | "opportunities.makeOffer" | "opportunities.pricePlaceholder" | "opportunities.estimatedTimePlaceholder" | "opportunities.messagePlaceholder" | "opportunities.sendOffer"
  | "security.revokeFailed" | "security.sessionsRevokeFailed" | "security.sessionsRevoked" | "security.sessionsRevokedBody" | "security.revokeCurrentTitle" | "security.revokeDeviceTitle" | "security.revokeCurrentBody" | "security.revokeDeviceBody" | "security.cancel" | "security.revoke" | "security.revokeOthersTitle" | "security.revokeOthersBody" | "security.revokeOthers" | "security.back" | "security.title" | "security.noticeTitle" | "security.noticeBody" | "security.activeDevices" | "security.loadFailed" | "security.retry" | "security.currentDevice" | "security.signedInDevice" | "security.active" | "security.deviceMissing" | "security.closed" | "security.lastActivity" | "security.signOut" | "security.close" | "security.noSessions" | "security.noSessionsBody"
  | ProviderOnboardingTranslationKey | ProfileEditTranslationKey | P17ClosureTranslationKey
  | `request.${string}` | `expense.${string}` | `verification.${string}` | `privacy.center.${string}`;

type Dictionary = Partial<Record<TranslationKey, string>>;
export type TranslationValues = Record<string, string | number>;

/**
 * P14-10 audited request-form fallback.  Legal copy is intentionally absent:
 * the form only contains operational UI strings.  Turkish has the canonical
 * localized source below; every other runtime locale receives this reviewed
 * English fallback instead of exposing an implementation key.
 */
const requestFallbackTranslations: Record<`request.${string}`, string> = {
  "request.backAccessibility": "Go back to the previous service request step",
  "request.title": "Service Request",
  "request.step": "Step {step}: {label}",
  "request.step.service": "Service",
  "request.step.details": "Details",
  "request.step.time": "Time",
  "request.step.location": "Location",
  "request.step.confirm": "Confirm",
  "request.chooseService": "What service do you need?",
  "request.servicesLoading": "Loading services…",
  "request.servicesFailed": "Services could not be loaded",
  "request.retry": "Try again",
  "request.subcategory": "Subcategory",
  "request.subcategoriesFailed": "Subcategories could not be loaded — try again",
  "request.noSubcategory": "No subcategory selection is required for this service.",
  "request.details.title": "Title",
  "request.details.titlePlaceholder": "Example: Kitchen tap is leaking",
  "request.details.description": "Description (optional)",
  "request.details.descriptionPlaceholder": "Describe the issue in more detail…",
  "request.urgency.emergency": "Emergency",
  "request.urgency.today": "Today",
  "request.urgency.scheduled": "Scheduled",
  "request.media.title": "Photo / Video",
  "request.media.add": "Add",
  "request.budget.min": "Minimum budget (₺)",
  "request.budget.max": "Maximum budget (₺)",
  "request.budget.zero": "0",
  "request.priceEstimate.title": "AI Price Intelligence",
  "request.priceEstimate.description": "This is an indicative range derived from similar completed jobs; it is not an offer or payment amount.",
  "request.priceEstimate.sampleDescription": "Calculated from {count} similar job records. The final maximum price is locked as No Surprise Price only after an offer is accepted.",
  "request.priceEstimate.noData": "There is not yet enough verified price data for this service. You can set your own budget and compare offers.",
  "request.priceEstimate.error": "The price estimate is currently unavailable. You can still create your request and compare professional offers.",
  "request.priceEstimate.apply": "Apply this range to my budget",
  "request.priceEstimate.accessibility": "Get AI price estimate",
  "request.priceEstimate.loading": "Calculating estimate…",
  "request.priceEstimate.show": "Show AI price range",
  "request.location.title": "Where will the service be provided?",
  "request.time.title": "When do you need it?",
  "request.route.title": "Enter route information",
  "request.country": "Service country",
  "request.countryAvailable": "Available",
  "request.countryComingSoon": "Coming soon",
  "request.countryBlocked": "Unavailable",
  "request.countryLoading": "Checking available countries…",
  "request.countryUnavailable": "No country is currently available for new marketplace requests.",
  "request.countryTurkeyAccessibility": "Türkiye service country",
  "request.countryTurkey": "Türkiye (TR)",
  "request.route.pickup": "Where will it be collected?",
  "request.route.pickupPlaceholder": "Pickup address",
  "request.route.destination": "Where will it be delivered?",
  "request.route.destinationPlaceholder": "Destination address",
  "request.route.loading": "Preparing route…",
  "request.route.show": "Show addresses on map",
  "request.route.pickupFallback": "Pickup",
  "request.route.destinationFallback": "Destination",
  "request.route.distance": "Approximate distance (km)",
  "request.route.distancePlaceholder": "Example: 12",
  "request.address": "Address",
  "request.addressPlaceholder": "Example: Bağdat Avenue No:123, Kadıköy, İstanbul",
  "request.location.loading": "Getting location…",
  "request.location.updated": "Location updated",
  "request.location.use": "Use my location",
  "request.summary.service": "Service",
  "request.summary.unselected": "Not selected",
  "request.summary.subcategory": "Subcategory",
  "request.summary.title": "Title",
  "request.summary.urgency": "Urgency",
  "request.summary.pickup": "From",
  "request.summary.destination": "To",
  "request.summary.distance": "Distance",
  "request.summary.address": "Address",
  "request.summary.media": "Media",
  "request.summary.budget": "Budget",
  "request.next": "Continue",
  "request.submit": "Create request",
  "request.locationPermissionTitle": "Location permission required",
  "request.locationPermissionBody": "Allow location access to match with nearby professionals.",
  "request.locationUnavailableTitle": "Location unavailable",
  "request.locationUnavailableBody": "Location information could not be read.",
  "request.routeAddressMissingTitle": "Address information missing",
  "request.routeAddressMissingBody": "Enter the pickup and destination addresses to create a route.",
  "request.routeNotFoundBody": "At least one address could not be found on the map. Add district and city information, then try again.",
  "request.routeUnavailableTitle": "Route could not be created",
  "request.routeUnavailableBody": "The addresses could not be resolved on the map.",
  "request.mediaLimitTitle": "Media limit",
  "request.mediaLimitBody": "A request can include up to {limit} photos or videos.",
  "request.galleryPermissionTitle": "Gallery permission required",
  "request.galleryPermissionBody": "Allow gallery access to add a photo or video.",
  "request.mediaRejectedTitle": "Some files were not added",
  "request.mediaRejectedBody": "Unsupported files or files above the allowed size were selected.",
  "request.submitSuccessTitle": "Request created",
  "request.submitSuccessBody": "Your service request was created. We will notify you when professionals send offers.",
  "request.submitPartialUploadBody": "Your service request was created, but {count} media files could not be uploaded. You can try again from the request details.",
  "request.submitErrorTitle": "Error",
  "request.submitErrorBody": "An error occurred while creating the request. Please try again.",
  "request.ok": "OK",
  "request.countryRequiredTitle": "Service country required",
  "request.countryRequiredBody": "Select the country where the service will be provided before creating a request.",
  "request.details.heading": "Describe the issue in detail",
  "request.details.painting": "Painting details",
  "request.details.area": "Area (m²)",
  "request.details.areaPlaceholder": "Example: 90",
  "request.measurement.accessibility": "Estimated area measurement",
  "request.measurement.title": "Estimated area measurement",
  "request.measurement.notice": "This is an estimate for describing the job. It is not a binding quote, price, or job decision.",
  "request.measurement.rectangle": "Rectangle",
  "request.measurement.polygon": "Polygon",
  "request.measurement.meters": "Meters",
  "request.measurement.centimeters": "Centimeters",
  "request.measurement.width": "Width",
  "request.measurement.height": "Height",
  "request.measurement.points": "Corner points",
  "request.measurement.pointsPlaceholder": "Example: 0,0; 4,0; 4,3; 0,3",
  "request.measurement.estimatedArea": "Estimated area",
  "request.measurement.invalid": "Enter valid, positive dimensions or at least three corner points.",
  "request.measurement.remove": "Remove / re-measure",
  "request.measurement.capability.MANUAL_ONLY": "Manual measurement is available on this device.",
  "request.measurement.capability.NOT_SUPPORTED": "AR measurement is not supported on this device; use manual measurement.",
  "request.measurement.capability.PERMISSION_REQUIRED": "Camera permission is required before AR measurement can be used; manual measurement remains available.",
  "request.measurement.capability.TEMPORARILY_UNAVAILABLE": "AR tracking is temporarily unavailable; use manual measurement or try again later.",
  "request.measurement.capability.AR_READY": "AR capability is ready. AR capture is not enabled until a verified native adapter is installed.",
  "request.details.roomCount": "Number of rooms",
  "request.details.roomPlaceholder": "Example: 3",
  "request.details.paintIncluded": "The professional brings the paint",
  "request.details.electrical": "Electrical work",
  "request.details.plumbing": "Plumbing work",
  "request.details.cleaning": "Cleaning details",
  "request.details.cleaningRoomPlaceholder": "Number of rooms",
  "request.details.moving": "Items to move",
  "request.details.movingPlaceholder": "List large items and the approximate number of boxes",
  "request.details.packing": "I want packing assistance",
  "request.details.courier": "Courier shipment",
  "request.details.weightPlaceholder": "Approximate weight (kg)",
  "request.details.towTruck": "Tow truck details",
  "request.details.roadside": "Roadside assistance details",
  "request.option.electricalFault": "Fault repair",
  "request.option.installation": "Installation",
  "request.option.electricalWiring": "Electrical wiring",
  "request.option.fusePanel": "Fuse / panel",
  "request.option.waterLeak": "Water leak",
  "request.option.blockage": "Blockage",
  "request.option.plumbingRenewal": "Plumbing renewal",
  "request.option.home": "Home",
  "request.option.office": "Office",
  "request.option.postConstruction": "Post-construction",
  "request.option.emptyApartment": "Empty apartment",
  "request.option.document": "Document",
  "request.option.smallPackage": "Small package",
  "request.option.box": "Box",
  "request.option.fragile": "Fragile item",
  "request.details.vehiclePlaceholder": "Vehicle make / model / plate",
  "request.details.problemPlaceholder": "Describe the issue or assistance you need",
  "request.media.hint": "Up to {limit} files; photos 8 MB and videos 25 MB.",
  "request.route.distanceHint": "The map value is an approximate straight-line distance; adjust it to the actual road distance if needed.",
  "request.route.pickupFloor": "Pickup floor",
  "request.route.destinationFloor": "Destination floor",
  "request.route.pickupElevator": "There is an elevator at the pickup address",
  "request.route.destinationElevator": "There is an elevator at the destination address",
  "request.summary.heading": "Request summary",
  "request.summary.fileCount": "{count} file(s)",
  "request.summary.postSubmitInfo": "After the request is created, suitable professionals will send offers. You can follow offers from the My Jobs screen.",
};

const requestTurkishTranslations: Partial<Record<`request.${string}`, string>> = {
  "request.backAccessibility": "Önceki hizmet talebi adımına dön",
  "request.title": "Hizmet Talebi",
  "request.step": "Adım {step}: {label}",
  "request.step.service": "Hizmet",
  "request.step.details": "Detay",
  "request.step.time": "Zaman",
  "request.step.location": "Konum",
  "request.step.confirm": "Onay",
  "request.chooseService": "Hangi hizmete ihtiyacınız var?",
  "request.servicesLoading": "Hizmetler yükleniyor…",
  "request.servicesFailed": "Hizmetler alınamadı",
  "request.retry": "Yeniden Dene",
  "request.subcategory": "Alt kategori",
  "request.subcategoriesFailed": "Alt kategoriler alınamadı — yeniden dene",
  "request.noSubcategory": "Bu hizmet için alt kategori seçimi gerekmiyor.",
  "request.details.title": "Başlık",
  "request.details.titlePlaceholder": "Örn: Mutfak musluğu su akıyor",
  "request.details.description": "Açıklama (opsiyonel)",
  "request.details.descriptionPlaceholder": "Sorununuzu daha detaylı açıklayın…",
  "request.urgency.emergency": "Acil",
  "request.urgency.today": "Bugün",
  "request.urgency.scheduled": "Planlı",
  "request.media.title": "Fotoğraf / Video",
  "request.media.add": "Ekle",
  "request.budget.min": "Min Bütçe (₺)",
  "request.budget.max": "Max Bütçe (₺)",
  "request.budget.zero": "0",
  "request.priceEstimate.title": "AI Fiyat Zekâsı",
  "request.priceEstimate.description": "Benzer tamamlanmış işlerden türetilen gösterge aralığıdır; teklif veya ödeme tutarı değildir.",
  "request.priceEstimate.sampleDescription": "{count} benzer iş kaydı üzerinden hesaplandı. Nihai üst fiyat, yalnız teklif kabul edildiğinde No Surprise Price olarak sabitlenir.",
  "request.priceEstimate.noData": "Bu hizmet için yeterli doğrulanmış fiyat verisi henüz oluşmadı. Bütçenizi kendiniz belirleyebilir ve teklifleri karşılaştırabilirsiniz.",
  "request.priceEstimate.error": "Fiyat tahmini şu anda alınamadı. Talebinizi yine de oluşturabilir ve profesyonel tekliflerini karşılaştırabilirsiniz.",
  "request.priceEstimate.apply": "Bu aralığı bütçeme uygula",
  "request.priceEstimate.accessibility": "AI fiyat tahmini al",
  "request.priceEstimate.loading": "Tahmin hesaplanıyor…",
  "request.priceEstimate.show": "AI fiyat aralığını göster",
  "request.location.title": "Hizmet nerede verilecek?",
  "request.time.title": "Ne zaman ihtiyacınız var?",
  "request.route.title": "Rota bilgilerini girin",
  "request.country": "Hizmet ülkesi",
  "request.countryAvailable": "Kullanılabilir",
  "request.countryComingSoon": "Yakında",
  "request.countryBlocked": "Kullanılamıyor",
  "request.countryLoading": "Kullanılabilir ülkeler doğrulanıyor…",
  "request.countryUnavailable": "Yeni pazar yeri talepleri için şu anda kullanılabilir ülke bulunmuyor.",
  "request.countryTurkeyAccessibility": "Türkiye hizmet ülkesi",
  "request.countryTurkey": "Türkiye (TR)",
  "request.route.pickup": "Nereden alınacak?",
  "request.route.pickupPlaceholder": "Başlangıç adresi",
  "request.route.destination": "Nereye götürülecek?",
  "request.route.destinationPlaceholder": "Varış adresi",
  "request.route.loading": "Rota hazırlanıyor…",
  "request.route.show": "Adresleri Haritada Göster",
  "request.route.pickupFallback": "Başlangıç",
  "request.route.destinationFallback": "Varış",
  "request.route.distance": "Yaklaşık Mesafe (km)",
  "request.route.distancePlaceholder": "Örn: 12",
  "request.address": "Adres",
  "request.addressPlaceholder": "Örn: Bağdat Cad. No:123 Kadıköy, İstanbul",
  "request.location.loading": "Konum alınıyor…",
  "request.location.updated": "Konum Güncellendi",
  "request.location.use": "Konumumu Kullan",
  "request.summary.service": "Hizmet",
  "request.summary.unselected": "Seçilmedi",
  "request.summary.subcategory": "Alt Kategori",
  "request.summary.title": "Başlık",
  "request.summary.urgency": "Aciliyet",
  "request.summary.pickup": "Nereden",
  "request.summary.destination": "Nereye",
  "request.summary.distance": "Mesafe",
  "request.summary.address": "Adres",
  "request.summary.media": "Medya",
  "request.summary.budget": "Bütçe",
  "request.next": "Devam",
  "request.submit": "Talep Oluştur",
  "request.locationPermissionTitle": "Konum İzni Gerekli",
  "request.locationPermissionBody": "Yakındaki profesyonellerle eşleşmek için konum izni vermelisiniz.",
  "request.locationUnavailableTitle": "Konum Alınamadı",
  "request.locationUnavailableBody": "Konum bilgisi okunamadı.",
  "request.routeAddressMissingTitle": "Adres Bilgisi Eksik",
  "request.routeAddressMissingBody": "Rota oluşturmak için başlangıç ve varış adreslerini girin.",
  "request.routeNotFoundBody": "Adreslerden en az biri haritada bulunamadı. İlçe ve şehir bilgilerini ekleyip tekrar deneyin.",
  "request.routeUnavailableTitle": "Rota Oluşturulamadı",
  "request.routeUnavailableBody": "Adresler haritada çözümlenemedi.",
  "request.mediaLimitTitle": "Medya Sınırı",
  "request.mediaLimitBody": "Bir talebe en fazla {limit} fotoğraf veya video eklenebilir.",
  "request.galleryPermissionTitle": "Galeri İzni Gerekli",
  "request.galleryPermissionBody": "Fotoğraf veya video eklemek için galeri erişimine izin vermelisiniz.",
  "request.mediaRejectedTitle": "Bazı Dosyalar Eklenmedi",
  "request.mediaRejectedBody": "Desteklenmeyen türde veya izin verilen boyuttan büyük dosyalar seçildi.",
  "request.submitSuccessTitle": "Talep Oluşturuldu",
  "request.submitSuccessBody": "Hizmet talebiniz başarıyla oluşturuldu. Ustalardan teklif geldiğinde size bildirim göndereceğiz.",
  "request.submitPartialUploadBody": "Hizmet talebiniz oluşturuldu; {count} medya dosyası yüklenemedi. Talep detayından tekrar deneyebilirsiniz.",
  "request.submitErrorTitle": "Hata",
  "request.submitErrorBody": "Talep oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
  "request.ok": "Tamam",
  "request.countryRequiredTitle": "Hizmet ülkesi gerekli",
  "request.countryRequiredBody": "Talep oluşturmadan önce hizmet verilecek ülkeyi seçin.",
  "request.details.heading": "Sorunu detaylı açıklayın",
  "request.details.painting": "Boya & Badana Detayları",
  "request.details.area": "Alan (m²)",
  "request.details.areaPlaceholder": "Örn: 90",
  "request.measurement.accessibility": "Tahmini alan ölçümü",
  "request.measurement.title": "Tahmini alan ölçümü",
  "request.measurement.notice": "Bu ölçüm işi tarif etmek için tahminidir; bağlayıcı teklif, fiyat veya iş kararı değildir.",
  "request.measurement.rectangle": "Dikdörtgen",
  "request.measurement.polygon": "Çokgen",
  "request.measurement.meters": "Metre",
  "request.measurement.centimeters": "Santimetre",
  "request.measurement.width": "Genişlik",
  "request.measurement.height": "Yükseklik",
  "request.measurement.points": "Köşe noktaları",
  "request.measurement.pointsPlaceholder": "Örn: 0,0; 4,0; 4,3; 0,3",
  "request.measurement.estimatedArea": "Tahmini alan",
  "request.measurement.invalid": "Geçerli, pozitif ölçüler veya en az üç köşe noktası girin.",
  "request.measurement.remove": "Sil / yeniden ölç",
  "request.measurement.capability.MANUAL_ONLY": "Bu cihazda manuel ölçüm kullanılabilir.",
  "request.measurement.capability.NOT_SUPPORTED": "Bu cihaz AR ölçümünü desteklemiyor; manuel ölçümü kullanın.",
  "request.measurement.capability.PERMISSION_REQUIRED": "AR ölçümü için kamera izni gerekir; manuel ölçüm kullanılabilir.",
  "request.measurement.capability.TEMPORARILY_UNAVAILABLE": "AR takibi geçici olarak kullanılamıyor; manuel ölçümü kullanın veya sonra tekrar deneyin.",
  "request.measurement.capability.AR_READY": "AR capability hazır. Doğrulanmış native adapter yüklenene kadar AR capture etkin değildir.",
  "request.details.roomCount": "Oda Sayısı",
  "request.details.roomPlaceholder": "Örn: 3",
  "request.details.paintIncluded": "Boyayı profesyonel getirsin",
  "request.details.electrical": "Elektrik İşlemi",
  "request.details.plumbing": "Tesisat İşlemi",
  "request.details.cleaning": "Temizlik Detayları",
  "request.details.cleaningRoomPlaceholder": "Oda sayısı",
  "request.details.moving": "Taşınacak Eşyalar",
  "request.details.movingPlaceholder": "Büyük eşyaları ve yaklaşık koli sayısını yazın",
  "request.details.packing": "Paketleme desteği istiyorum",
  "request.details.courier": "Kurye Gönderisi",
  "request.details.weightPlaceholder": "Yaklaşık ağırlık (kg)",
  "request.details.towTruck": "Çekici Detayları",
  "request.details.roadside": "Yol Yardım Detayları",
  "request.option.electricalFault": "Arıza",
  "request.option.installation": "Montaj",
  "request.option.electricalWiring": "Tesisat",
  "request.option.fusePanel": "Sigorta / Pano",
  "request.option.waterLeak": "Su Kaçağı",
  "request.option.blockage": "Tıkanıklık",
  "request.option.plumbingRenewal": "Tesisat Yenileme",
  "request.option.home": "Ev",
  "request.option.office": "Ofis",
  "request.option.postConstruction": "İnşaat Sonrası",
  "request.option.emptyApartment": "Boş Daire",
  "request.option.document": "Evrak",
  "request.option.smallPackage": "Küçük Paket",
  "request.option.box": "Koli",
  "request.option.fragile": "Hassas Ürün",
  "request.details.vehiclePlaceholder": "Araç marka / model / plaka",
  "request.details.problemPlaceholder": "Arıza veya yardım ihtiyacını açıklayın",
  "request.media.hint": "En fazla {limit} dosya; fotoğraf 8 MB, video 25 MB.",
  "request.route.distanceHint": "Harita değeri kuş uçuşu yaklaşık mesafedir; gerçek yol mesafesini gerekirse düzenleyin.",
  "request.route.pickupFloor": "Alınacak Kat",
  "request.route.destinationFloor": "Varış Katı",
  "request.route.pickupElevator": "Alınacak adreste asansör var",
  "request.route.destinationElevator": "Varış adresinde asansör var",
  "request.summary.heading": "Talep Özeti",
  "request.summary.fileCount": "{count} dosya",
  "request.summary.postSubmitInfo": "Talebiniz oluşturulduktan sonra size uygun ustalar teklif gönderecektir. Teklifleri “İşlerim” ekranından takip edebilirsiniz.",
};

/** P14-10: operational expense-file UI only; no legal copy is fabricated. */
const expenseFallbackTranslations: Record<`expense.${string}`, string> = {
  "expense.invalidRequest": "No valid job was selected.", "expense.backAccessibility": "Go back", "expense.backHint": "Returns to the previous screen", "expense.title": "Job expenses", "expense.totalLabel": "TOTAL RECORDED EXPENSES", "expense.totalNotice": "Recorded expenses do not automatically create a charge for the customer. A refund request follows a separate approval process.", "expense.add": "Add expense", "expense.open": "Open", "expense.close": "Close", "expense.category": "CATEGORY",
  "expense.category.fuel": "Fuel", "expense.category.toll": "Toll / bridge", "expense.category.parking": "Parking", "expense.category.material": "Material", "expense.category.part": "Spare part", "expense.category.paint": "Paint", "expense.category.equipment": "Equipment", "expense.category.transport": "Transport", "expense.category.packaging": "Packaging", "expense.category.other": "Other",
  "expense.amountAccessibility": "Expense amount", "expense.amountHint": "Enter the expense amount in Turkish lira", "expense.amountPlaceholder": "Amount (TRY)", "expense.descriptionAccessibility": "Expense description", "expense.descriptionPlaceholder": "Expense description", "expense.vendorAccessibility": "Seller or store name", "expense.vendorHint": "Optional", "expense.vendorPlaceholder": "Seller / store (optional)",
  "expense.brandAccessibility": "Product brand", "expense.brandPlaceholder": "Brand (optional)", "expense.modelAccessibility": "Product model", "expense.modelPlaceholder": "Model (optional)", "expense.quantityAccessibility": "Product quantity", "expense.quantityPlaceholder": "Quantity (optional)", "expense.locationAccessibility": "Purchase location link", "expense.locationPlaceholder": "Location link (optional)", "expense.locationHint": "Use a valid HTTPS location link when available", "expense.evidenceRole": "EVIDENCE TYPE", "expense.evidenceRole.receipt": "Receipt", "expense.evidenceRole.invoice": "Invoice", "expense.evidenceRole.product": "Product", "expense.evidenceRole.material": "Material", "expense.evidenceRole.video": "Video", "expense.evidenceRole.other": "Other", "expense.receiptSelectedAccessibility": "Expense evidence selected", "expense.receiptAddAccessibility": "Add expense evidence image", "expense.receiptHint": "Selects an image; it remains unavailable until the security scan is clean", "expense.receiptSelected": "Evidence selected", "expense.receiptAdd": "Add evidence image", "expense.evidenceScanNotice": "Evidence is available only after the security scan is clean.", "expense.saveAccessibility": "Save expense", "expense.saveHint": "Creates the expense record securely", "expense.saving": "Saving…", "expense.save": "Save expense",
  "expense.evidenceAddAccessibility": "Add expense evidence", "expense.evidenceAddHint": "Adds photos or a video for the selected evidence type", "expense.evidenceAdd": "Add evidence", "expense.evidenceRemove": "Remove", "expense.evidenceRemoveAccessibility": "Remove {name}", "expense.evidenceLimits": "Up to {files} files per request; up to {photos} photos for each evidence type and {videos} videos per expense. Videos must be 60 seconds or shorter.",
  "expense.records": "Records", "expense.loadFailed": "Expenses could not be loaded. Please try again.", "expense.empty": "There are no recorded expenses for this job yet.", "expense.defaultCategory": "Expense", "expense.refund.approved": "Refund request approved", "expense.refund.rejected": "Refund request rejected", "expense.refund.pending": "Refund request awaiting customer approval", "expense.refund.requestAccessibility": "Request a refund for this expense", "expense.refund.requestHint": "Creates a refund request for customer approval", "expense.refund.request": "Request a refund for this expense", "expense.refund.approveAccessibility": "Approve refund request", "expense.refund.approveHint": "Approves the request; does not start automatic collection", "expense.refund.approve": "Approve", "expense.refund.rejectAccessibility": "Reject refund request", "expense.refund.reject": "Reject",
  "expense.alert.savedTitle": "Expense saved", "expense.alert.savedBody": "The expense did not automatically charge the customer. You may create a separate refund request if needed.", "expense.alert.refundSubmittedTitle": "Refund request submitted", "expense.alert.refundSubmittedBody": "The request was recorded; no collection occurs without separate customer approval.", "expense.alert.refundApprovedTitle": "Request approved", "expense.alert.refundRejectedTitle": "Request rejected", "expense.alert.refundResolvedBody": "This decision only records the expense request; it does not automatically charge your account.", "expense.alert.confirmApproveTitle": "Approve refund request", "expense.alert.confirmRejectTitle": "Reject refund request", "expense.alert.confirmApproveBody": "This action does not create automatic collection; it only records the approval decision.", "expense.alert.confirmRejectBody": "The request is rejected and a new request for this expense is not created automatically.", "expense.cancel": "Cancel", "expense.alert.galleryPermissionTitle": "Gallery permission required", "expense.alert.galleryPermissionBody": "Allow access to your photo library to add an expense document.", "expense.alert.receiptRejectedTitle": "Document could not be added", "expense.alert.receiptRejectedBody": "You can add image proof of up to 10 MB only.", "expense.alert.amountRequiredTitle": "Amount required", "expense.alert.amountRequiredBody": "Enter the expense amount as a whole Turkish lira amount.", "expense.alert.descriptionRequiredTitle": "Description required", "expense.alert.descriptionRequiredBody": "Enter a description of at least 3 characters for the expense.", "expense.alert.saveFailedTitle": "Expense could not be saved", "expense.alert.safeFailure": "The action could not be completed safely.",
  "expense.alert.evidenceRejectedTitle": "Evidence could not be added", "expense.alert.imageRejectedBody": "Select a supported image within the secure size limit.", "expense.alert.videoRejectedBody": "Select a supported video of no more than 60 seconds within the secure size limit.", "expense.alert.evidenceLimitTitle": "Evidence limit reached", "expense.alert.evidenceLimitBody": "This expense cannot include more evidence items.", "expense.alert.roleLimitBody": "You can add at most {count} images for this evidence type.", "expense.alert.videoLimitBody": "You can add at most {count} videos to an expense.",
};

const expenseTurkishTranslations: Partial<Record<`expense.${string}`, string>> = {
  "expense.invalidRequest": "Geçerli bir iş seçilmedi.", "expense.backAccessibility": "Geri", "expense.backHint": "Önceki ekrana döner", "expense.title": "İş masrafları", "expense.totalLabel": "TOPLAM KAYITLI MASRAF", "expense.totalNotice": "Kayıtlı masraf, müşteri hesabına otomatik borç oluşturmaz. İade talebi ayrı onay sürecidir.", "expense.add": "Masraf ekle", "expense.open": "Aç", "expense.close": "Kapat", "expense.category": "KATEGORİ",
  "expense.category.fuel": "Yakıt", "expense.category.toll": "Otoyol / köprü", "expense.category.parking": "Otopark", "expense.category.material": "Malzeme", "expense.category.part": "Yedek parça", "expense.category.paint": "Boya", "expense.category.equipment": "Ekipman", "expense.category.transport": "Taşıma", "expense.category.packaging": "Ambalaj", "expense.category.other": "Diğer",
  "expense.amountAccessibility": "Masraf tutarı", "expense.amountHint": "Türk lirası cinsinden masraf tutarını girin", "expense.amountPlaceholder": "Tutar (TL)", "expense.descriptionAccessibility": "Masraf açıklaması", "expense.descriptionPlaceholder": "Masraf açıklaması", "expense.vendorAccessibility": "Satıcı veya mağaza adı", "expense.vendorHint": "İsteğe bağlı", "expense.vendorPlaceholder": "Satıcı / mağaza (opsiyonel)",
  "expense.brandAccessibility": "Ürün markası", "expense.brandPlaceholder": "Marka (opsiyonel)", "expense.modelAccessibility": "Ürün modeli", "expense.modelPlaceholder": "Model (opsiyonel)", "expense.quantityAccessibility": "Ürün miktarı", "expense.quantityPlaceholder": "Miktar (opsiyonel)", "expense.locationAccessibility": "Satın alma konumu bağlantısı", "expense.locationPlaceholder": "Konum bağlantısı (opsiyonel)", "expense.locationHint": "Varsa geçerli bir HTTPS konum bağlantısı kullanın", "expense.evidenceRole": "KANIT TÜRÜ", "expense.evidenceRole.receipt": "Fiş", "expense.evidenceRole.invoice": "Fatura", "expense.evidenceRole.product": "Ürün", "expense.evidenceRole.material": "Malzeme", "expense.evidenceRole.video": "Video", "expense.evidenceRole.other": "Diğer", "expense.receiptSelectedAccessibility": "Masraf kanıtı seçildi", "expense.receiptAddAccessibility": "Masraf kanıtı görseli ekle", "expense.receiptHint": "Bir görsel seçer; güvenlik taraması temizlenene kadar erişilemez", "expense.receiptSelected": "Kanıt seçildi", "expense.receiptAdd": "Kanıt görseli ekle", "expense.evidenceScanNotice": "Kanıt, yalnız güvenlik taraması temizlendikten sonra erişilebilir olur.", "expense.saveAccessibility": "Masrafı kaydet", "expense.saveHint": "Masraf kaydını güvenli olarak oluşturur", "expense.saving": "Kaydediliyor…", "expense.save": "Masrafı kaydet",
  "expense.evidenceAddAccessibility": "Masraf kanıtı ekle", "expense.evidenceAddHint": "Seçili kanıt türü için fotoğraf veya video ekler", "expense.evidenceAdd": "Kanıt ekle", "expense.evidenceRemove": "Kaldır", "expense.evidenceRemoveAccessibility": "{name} kanıtını kaldır", "expense.evidenceLimits": "Talep başına en fazla {files} dosya; her kanıt türü için en fazla {photos} fotoğraf ve masraf başına {videos} video. Videolar 60 saniyeyi geçemez.",
  "expense.records": "Kayıtlar", "expense.loadFailed": "Masraflar yüklenemedi. Lütfen tekrar deneyin.", "expense.empty": "Bu iş için henüz masraf kaydı bulunmuyor.", "expense.defaultCategory": "Masraf", "expense.refund.approved": "İade talebi onaylandı", "expense.refund.rejected": "İade talebi reddedildi", "expense.refund.pending": "İade talebi müşteri onayında", "expense.refund.requestAccessibility": "Bu masraf için iade talep et", "expense.refund.requestHint": "Müşteri onayına sunulan geri ödeme talebi oluşturur", "expense.refund.request": "Bu masraf için iade talep et", "expense.refund.approveAccessibility": "İade talebini onayla", "expense.refund.approveHint": "Talebi onaylar; otomatik tahsilat başlatmaz", "expense.refund.approve": "Onayla", "expense.refund.rejectAccessibility": "İade talebini reddet", "expense.refund.reject": "Reddet",
  "expense.alert.savedTitle": "Masraf kaydedildi", "expense.alert.savedBody": "Masraf otomatik olarak müşteriye borçlandırılmadı. Gerekirse ayrı iade talebi oluşturabilirsiniz.", "expense.alert.refundSubmittedTitle": "İade talebi gönderildi", "expense.alert.refundSubmittedBody": "Talep kayıt altına alındı; müşteriden ayrıca onay alınmadan tahsilat yapılmaz.", "expense.alert.refundApprovedTitle": "Talep onaylandı", "expense.alert.refundRejectedTitle": "Talep reddedildi", "expense.alert.refundResolvedBody": "Bu karar yalnız masraf talebini kaydeder; hesabınızdan otomatik tahsilat yapılmaz.", "expense.alert.confirmApproveTitle": "İade talebini onayla", "expense.alert.confirmRejectTitle": "İade talebini reddet", "expense.alert.confirmApproveBody": "Bu işlem otomatik tahsilat oluşturmaz; yalnız talebin onay kaydını tutar.", "expense.alert.confirmRejectBody": "Talep reddedilir ve bu masraf için yeni bir talep otomatik oluşturulmaz.", "expense.cancel": "Vazgeç", "expense.alert.galleryPermissionTitle": "Galeri izni gerekli", "expense.alert.galleryPermissionBody": "Masraf belgesi eklemek için fotoğraf arşivinize erişim izni vermelisiniz.", "expense.alert.receiptRejectedTitle": "Belge eklenemedi", "expense.alert.receiptRejectedBody": "Yalnız en fazla 10 MB boyutunda görsel kanıt ekleyebilirsiniz.", "expense.alert.amountRequiredTitle": "Tutar gerekli", "expense.alert.amountRequiredBody": "Masraf tutarını tam Türk lirası olarak girin.", "expense.alert.descriptionRequiredTitle": "Açıklama gerekli", "expense.alert.descriptionRequiredBody": "Masraf için en az 3 karakter açıklama girin.", "expense.alert.saveFailedTitle": "Masraf kaydedilemedi", "expense.alert.safeFailure": "İşlem güvenli biçimde tamamlanamadı.",
  "expense.alert.evidenceRejectedTitle": "Kanıt eklenemedi", "expense.alert.imageRejectedBody": "Güvenli boyut sınırı içinde desteklenen bir görsel seçin.", "expense.alert.videoRejectedBody": "Güvenli boyut sınırı içinde en fazla 60 saniyelik desteklenen bir video seçin.", "expense.alert.evidenceLimitTitle": "Kanıt sınırına ulaşıldı", "expense.alert.evidenceLimitBody": "Bu masrafa daha fazla kanıt öğesi eklenemez.", "expense.alert.roleLimitBody": "Bu kanıt türü için en fazla {count} görsel ekleyebilirsiniz.", "expense.alert.videoLimitBody": "Bir masrafa en fazla {count} video ekleyebilirsiniz.",
};

/** P14-15: staged contact verification UI; non-Turkish locales use reviewed English fallback. */
const verificationFallbackTranslations: Record<`verification.${string}`, string> = {
  "verification.email.title": "Verify your email",
  "verification.phone.title": "Verify your phone",
  "verification.email.instruction": "Enter the 6-digit code sent to {destination}.",
  "verification.phone.instruction": "Enter the 6-digit code sent to your registered number.",
  "verification.signInRequired": "Sign in with your account to continue.",
  "verification.codePlaceholder": "000000",
  "verification.codeEmailAccessibility": "Six-digit email verification code",
  "verification.codePhoneAccessibility": "Six-digit phone verification code",
  "verification.codeHint": "Enter the six digits sent to you.",
  "verification.verifyAndContinue": "Verify and continue",
  "verification.verify": "Verify",
  "verification.requesting": "Requesting code…",
  "verification.resend": "Resend code",
  "verification.emailResent": "A new code was sent to your email address.",
  "verification.phoneResent": "A new code was sent to your phone.",
  "verification.status.unverified": "Not verified",
  "verification.status.pending": "Verification pending",
  "verification.status.verified": "Verified",
  "verification.status.loading": "Checking verification status…",
  "verification.status.email": "Email: {status}",
  "verification.status.phone": "Phone: {status}",
};

const verificationTurkishTranslations: Partial<Record<`verification.${string}`, string>> = {
  "verification.email.title": "E-postanızı doğrulayın",
  "verification.phone.title": "Telefonunuzu doğrulayın",
  "verification.email.instruction": "{destination} adresine gönderilen 6 haneli kodu girin.",
  "verification.phone.instruction": "Kayıtlı numaranıza gönderilen 6 haneli kodu girin.",
  "verification.signInRequired": "Devam etmek için hesabınızla giriş yapın.",
  "verification.codePlaceholder": "000000",
  "verification.codeEmailAccessibility": "Altı haneli e-posta doğrulama kodu",
  "verification.codePhoneAccessibility": "Altı haneli telefon doğrulama kodu",
  "verification.codeHint": "Size gönderilen altı rakamı girin.",
  "verification.verifyAndContinue": "Doğrula ve devam et",
  "verification.verify": "Doğrula",
  "verification.requesting": "Kod isteniyor…",
  "verification.resend": "Kodu tekrar gönder",
  "verification.emailResent": "Yeni kod e-posta adresinize gönderildi.",
  "verification.phoneResent": "Yeni kod telefonunuza gönderildi.",
  "verification.status.unverified": "Doğrulanmadı",
  "verification.status.pending": "Doğrulama bekliyor",
  "verification.status.verified": "Doğrulandı",
  "verification.status.loading": "Doğrulama durumu kontrol ediliyor…",
  "verification.status.email": "E-posta: {status}",
  "verification.status.phone": "Telefon: {status}",
};

/** P14-14 operational privacy request UI; legal text remains source-controlled elsewhere. */
const privacyCenterFallbackTranslations: Record<`privacy.center.${string}`, string> = {
  "privacy.center.title": "Privacy center",
  "privacy.center.subtitle": "Request a copy of your data or request account deletion. Sensitive requests require your password and a one-time security code.",
  "privacy.center.export": "Request data export",
  "privacy.center.erasure": "Request account deletion",
  "privacy.center.reason": "Optional request note",
  "privacy.center.reasonPlaceholder": "Add a short note (optional)",
  "privacy.center.password": "Password",
  "privacy.center.passwordPlaceholder": "Enter your password",
  "privacy.center.code": "Security code",
  "privacy.center.codePlaceholder": "000000",
  "privacy.center.requestCode": "Send security code",
  "privacy.center.requestingCode": "Sending security code…",
  "privacy.center.submit": "Submit request",
  "privacy.center.submitting": "Submitting request…",
  "privacy.center.reauthNotice": "The request is not submitted unless both your password and a valid one-time security code are verified.",
  "privacy.center.success": "Your privacy request was recorded.",
  "privacy.center.error": "The privacy request could not be completed securely.",
  "privacy.center.history": "Your requests",
  "privacy.center.empty": "You do not have any privacy requests yet.",
  "privacy.center.type.export": "Data export",
  "privacy.center.type.rectification": "Correct personal data",
  "privacy.center.type.erasure": "Account deletion",
  "privacy.center.status.open": "Status: received",
  "privacy.center.status.in_review": "Status: under review",
  "privacy.center.status.blocked_legal_hold": "Status: paused by legal hold",
  "privacy.center.status.approved": "Status: approved",
  "privacy.center.status.rejected": "Status: not approved",
  "privacy.center.status.completed": "Status: completed",
  "privacy.center.back": "Go back",
  "privacy.center.scope.title": "Data currently covered by your request",
  "privacy.center.scope.translationPreference": "Message translation preference: {language}",
  "privacy.center.scope.translationProvenance": "Translation provenance records: {count}",
  "privacy.center.scope.contactVerification": "Contact verification records: {count}",
  "privacy.center.scope.contactChanges": "Contact-change audit records: {count}",
  "privacy.center.scope.truncated": "Only the most recent records are shown here; the request remains subject to secure export review.",
  "privacy.center.scope.erasureReview": "Deletion is not automatic. Retention and legal-hold review are required before protected records can be changed.",
};

const privacyCenterTurkishTranslations: Partial<Record<`privacy.center.${string}`, string>> = {
  "privacy.center.title": "Gizlilik merkezi",
  "privacy.center.subtitle": "Verilerinizin kopyasını isteyebilir veya hesap silme talebi oluşturabilirsiniz. Hassas talepler için parola ve tek kullanımlık güvenlik kodu gerekir.",
  "privacy.center.export": "Veri dışa aktarma talebi",
  "privacy.center.erasure": "Hesap silme talebi",
  "privacy.center.reason": "İsteğe bağlı talep notu",
  "privacy.center.reasonPlaceholder": "Kısa bir not ekleyin (isteğe bağlı)",
  "privacy.center.password": "Parola",
  "privacy.center.passwordPlaceholder": "Parolanızı girin",
  "privacy.center.code": "Güvenlik kodu",
  "privacy.center.codePlaceholder": "000000",
  "privacy.center.requestCode": "Güvenlik kodu gönder",
  "privacy.center.requestingCode": "Güvenlik kodu gönderiliyor…",
  "privacy.center.submit": "Talebi gönder",
  "privacy.center.submitting": "Talep gönderiliyor…",
  "privacy.center.reauthNotice": "Parolanız ve geçerli tek kullanımlık güvenlik kodunuz doğrulanmadan talep gönderilmez.",
  "privacy.center.success": "Gizlilik talebiniz kaydedildi.",
  "privacy.center.error": "Gizlilik talebi güvenli biçimde tamamlanamadı.",
  "privacy.center.history": "Talepleriniz",
  "privacy.center.empty": "Henüz gizlilik talebiniz bulunmuyor.",
  "privacy.center.type.export": "Veri dışa aktarma",
  "privacy.center.type.rectification": "Kişisel verileri düzeltme",
  "privacy.center.type.erasure": "Hesap silme",
  "privacy.center.status.open": "Durum: alındı",
  "privacy.center.status.in_review": "Durum: incelemede",
  "privacy.center.status.blocked_legal_hold": "Durum: yasal bekletmede",
  "privacy.center.status.approved": "Durum: onaylandı",
  "privacy.center.status.rejected": "Durum: onaylanmadı",
  "privacy.center.status.completed": "Durum: tamamlandı",
  "privacy.center.back": "Geri dön",
  "privacy.center.scope.title": "Talebinizin kapsadığı mevcut veriler",
  "privacy.center.scope.translationPreference": "Mesaj çeviri tercihi: {language}",
  "privacy.center.scope.translationProvenance": "Çeviri kaynak kaydı: {count}",
  "privacy.center.scope.contactVerification": "İletişim doğrulama kaydı: {count}",
  "privacy.center.scope.contactChanges": "İletişim değişikliği denetim kaydı: {count}",
  "privacy.center.scope.truncated": "Burada yalnız en güncel kayıtlar gösterilir; talep güvenli dışa aktarma incelemesine tabidir.",
  "privacy.center.scope.erasureReview": "Silme otomatik değildir. Korunan kayıtlar değişmeden önce saklama ve yasal bekletme incelemesi gerekir.",
};

const providerOnboardingFallbackTranslations: Record<ProviderOnboardingTranslationKey, string> = {
  "provider.onboarding.backAccessibility": "Go back", "provider.onboarding.title": "Professional setup", "provider.onboarding.subtitle": "Activation opens only after the server has verified your service scope, jurisdiction, documents, and security decisions.", "provider.onboarding.loadErrorTitle": "Setup information could not be loaded", "provider.onboarding.retry": "Try again", "provider.onboarding.setupSavedTitle": "Setup saved", "provider.onboarding.setupSavedBody": "Your service scope is under review. Activation remains blocked until documents and authorization checks are complete.", "provider.onboarding.setupFailedTitle": "Setup could not be saved", "provider.onboarding.setupFailedBody": "Please try again.", "provider.onboarding.activationStatus": "Activation status: {status}", "provider.onboarding.activationEligible": "Eligible", "provider.onboarding.activationBlocked": "Blocked", "provider.onboarding.step.profile": "Profile", "provider.onboarding.step.serviceScope": "Service scope", "provider.onboarding.step.jurisdiction": "Work model and jurisdiction", "provider.onboarding.step.capability": "Capability review", "provider.onboarding.step.credentials": "Dynamic credentials", "provider.onboarding.step.documents": "Uploaded documents", "provider.onboarding.step.launchGate": "Country Launch Gate", "provider.onboarding.scope.title": "Choose your service scope", "provider.onboarding.scope.help": "Selections come only from the active canonical catalog. The server validates scope compatibility again when you save.", "provider.onboarding.country": "Country of operation", "provider.onboarding.countryLoading": "Checking available countries…", "provider.onboarding.countryUnavailable": "No country is currently available for professional activation.", "provider.onboarding.countryAvailable": "Available", "provider.onboarding.countryComingSoon": "Coming soon", "provider.onboarding.countryBlocked": "Unavailable", "provider.onboarding.category": "Category", "provider.onboarding.subcategory": "Subcategory", "provider.onboarding.selectCategoryScope": "Select the category-level service", "provider.onboarding.categoryScopeHelp": "This category is evaluated at category scope.", "provider.onboarding.capabilityScope": "Capability scope", "provider.onboarding.noCapability": "No active capability exists for this scope.", "provider.onboarding.saveScope": "Save service scope", "provider.onboarding.openDocuments": "Open document requirements", "provider.onboarding.openDocumentsHint": "Requirements come from the approved source on the server.", "provider.onboarding.emptyOptions": "No options are available.", "provider.onboarding.status.complete": "Complete", "provider.onboarding.status.selected": "Selected", "provider.onboarding.status.verified": "Verified", "provider.onboarding.status.approved": "Approved", "provider.onboarding.status.eligible": "Eligible", "provider.onboarding.status.blocked": "Blocked", "provider.onboarding.status.pending": "Pending", "provider.onboarding.status.missing": "Missing", "provider.onboarding.status.unknown": "Unknown", "provider.onboarding.dashboardCtaTitle": "Complete your professional setup", "provider.onboarding.dashboardCtaBody": "Documents, authorization, and country eligibility are verified by the server.",
};

const providerOnboardingTurkishTranslations: Record<ProviderOnboardingTranslationKey, string> = {
  "provider.onboarding.backAccessibility": "Geri", "provider.onboarding.title": "Profesyonel kurulumu", "provider.onboarding.subtitle": "Aktivasyon yalnız sunucu tarafından doğrulanmış hizmet kapsamı, bölge, belge ve güvenlik kararları tamamlandığında açılır.", "provider.onboarding.loadErrorTitle": "Kurulum bilgileri yüklenemedi", "provider.onboarding.retry": "Tekrar dene", "provider.onboarding.setupSavedTitle": "Kurulum kaydedildi", "provider.onboarding.setupSavedBody": "Hizmet kapsamınız incelemeye alındı. Belgeler ve yetki kontrolleri tamamlanmadan aktifleşme yapılmaz.", "provider.onboarding.setupFailedTitle": "Kurulum kaydedilemedi", "provider.onboarding.setupFailedBody": "Lütfen tekrar deneyin.", "provider.onboarding.activationStatus": "Aktivasyon durumu: {status}", "provider.onboarding.activationEligible": "Uygun", "provider.onboarding.activationBlocked": "Bloklu", "provider.onboarding.step.profile": "Profil", "provider.onboarding.step.serviceScope": "Hizmet kapsamı", "provider.onboarding.step.jurisdiction": "Çalışma modeli ve bölge", "provider.onboarding.step.capability": "Capability incelemesi", "provider.onboarding.step.credentials": "Dinamik yetki belgeleri", "provider.onboarding.step.documents": "Yüklenen belgeler", "provider.onboarding.step.launchGate": "Country Launch Gate", "provider.onboarding.scope.title": "Hizmet kapsamını seçin", "provider.onboarding.scope.help": "Seçimler yalnız aktif kanonik katalogdan gelir. Kaydetme sırasında sunucu kapsam uyumunu tekrar doğrular.", "provider.onboarding.country": "Çalışma ülkesi", "provider.onboarding.countryLoading": "Kullanılabilir ülkeler doğrulanıyor…", "provider.onboarding.countryUnavailable": "Profesyonel aktivasyonu için şu anda kullanılabilir ülke bulunmuyor.", "provider.onboarding.countryAvailable": "Kullanılabilir", "provider.onboarding.countryComingSoon": "Yakında", "provider.onboarding.countryBlocked": "Kullanılamıyor", "provider.onboarding.category": "Kategori", "provider.onboarding.subcategory": "Alt kategori", "provider.onboarding.selectCategoryScope": "Kategori düzeyindeki hizmeti seç", "provider.onboarding.categoryScopeHelp": "Bu kategori kategori düzeyi kapsamla değerlendirilir.", "provider.onboarding.capabilityScope": "Yetenek kapsamı", "provider.onboarding.noCapability": "Bu kapsam için etkin capability yok.", "provider.onboarding.saveScope": "Hizmet kapsamını kaydet", "provider.onboarding.openDocuments": "Belge gereksinimlerini aç", "provider.onboarding.openDocumentsHint": "Gereksinimler sunucudaki onaylı kaynaktan gelir.", "provider.onboarding.emptyOptions": "Seçenek bulunamadı.", "provider.onboarding.status.complete": "Tamam", "provider.onboarding.status.selected": "Seçildi", "provider.onboarding.status.verified": "Doğrulandı", "provider.onboarding.status.approved": "Onaylandı", "provider.onboarding.status.eligible": "Uygun", "provider.onboarding.status.blocked": "Bloklu", "provider.onboarding.status.pending": "Bekliyor", "provider.onboarding.status.missing": "Eksik", "provider.onboarding.status.unknown": "Bilinmiyor", "provider.onboarding.dashboardCtaTitle": "Profesyonel kurulumunu tamamla", "provider.onboarding.dashboardCtaBody": "Belge, yetki ve ülke uygunluğu sunucu tarafından kontrol edilir.",
};

const profileEditFallbackTranslations: Record<ProfileEditTranslationKey, string> = {
  "profile.edit.backAccessibility": "Go back", "profile.edit.title": "Profile information", "profile.edit.name": "Full name", "profile.edit.email": "Email", "profile.edit.phone": "Phone", "profile.edit.saveAccessibility": "Save profile information", "profile.edit.save": "Save", "profile.edit.verificationRequiredTitle": "Email verification required", "profile.edit.verificationRequiredBody": "Enter the code sent to your new email address to confirm this change.", "profile.edit.verifyNow": "Verify now", "profile.edit.updatedTitle": "Profile updated", "profile.edit.updatedBody": "Your information was saved securely.", "profile.edit.done": "Done", "profile.edit.updateFailedTitle": "Profile could not be updated", "profile.edit.updateFailedBody": "Please check your information and try again.", "profile.edit.phoneVerificationRequiredTitle": "Phone verification required", "profile.edit.phoneVerificationRequiredBody": "Enter the code sent to your new phone number to confirm this change.", "profile.edit.pendingEmail": "Email change is waiting for verification.", "profile.edit.pendingPhone": "Phone change is waiting for verification.", "profile.edit.pendingVerifyNow": "Verify pending change",
};

const profileEditTurkishTranslations: Record<ProfileEditTranslationKey, string> = {
  "profile.edit.backAccessibility": "Geri", "profile.edit.title": "Profil Bilgileri", "profile.edit.name": "Ad Soyad", "profile.edit.email": "E-posta", "profile.edit.phone": "Telefon", "profile.edit.saveAccessibility": "Profil bilgilerini kaydet", "profile.edit.save": "Kaydet", "profile.edit.verificationRequiredTitle": "E-posta doğrulaması gerekli", "profile.edit.verificationRequiredBody": "Yeni e-posta adresinizi doğrulamak için size gönderilen kodu girin.", "profile.edit.verifyNow": "Şimdi doğrula", "profile.edit.updatedTitle": "Profil güncellendi", "profile.edit.updatedBody": "Bilgileriniz güvenli biçimde kaydedildi.", "profile.edit.done": "Tamam", "profile.edit.updateFailedTitle": "Profil güncellenemedi", "profile.edit.updateFailedBody": "Lütfen bilgilerinizi kontrol edip yeniden deneyin.", "profile.edit.phoneVerificationRequiredTitle": "Telefon doğrulaması gerekli", "profile.edit.phoneVerificationRequiredBody": "Yeni telefon numaranızı doğrulamak için size gönderilen kodu girin.", "profile.edit.pendingEmail": "E-posta değişikliği doğrulama bekliyor.", "profile.edit.pendingPhone": "Telefon değişikliği doğrulama bekliyor.", "profile.edit.pendingVerifyNow": "Bekleyen değişikliği doğrula",
};

const p17ClosureFallbackTranslations: Record<P17ClosureTranslationKey, string> = {
  "organization.title": "Organization Management", "organization.subtitle": "Facilities, assets and planned maintenance", "organization.none": "You do not have an active organization membership.", "organization.sites": "Locations", "organization.assets": "Assets", "organization.schedules": "Maintenance Schedule", "organization.batches": "Bulk Service Requests", "organization.invoices": "Organization Invoices", "organization.loading": "Loading organization data…", "organization.noSites": "No location added", "organization.noAssets": "No registered asset", "organization.noSchedules": "No planned maintenance", "organization.noBatches": "No bulk service request", "organization.noInvoices": "No invoice backed by a verified payment", "organization.error": "Organization data could not be loaded.",
  "provider.documents.backAccessibility": "Go back", "provider.documents.title": "My professional documents", "provider.documents.secureUploadTitle": "Upload documents securely for verification", "provider.documents.secureUploadBody": "Document requirements are retrieved from the server for your service scope. Files are limited to 10 MB; type and signature are verified on the server.", "provider.documents.requirementsLoading": "Loading document requirements", "provider.documents.requirementsUnavailable": "Document requirements are unavailable", "provider.documents.requirementsUnavailableBody": "Document upload cannot open until the secure list is loaded.", "provider.documents.retry": "Try again", "provider.documents.uploadDisabled": "Document upload is unavailable", "provider.documents.uploadDisabledBody": "You cannot upload until the scope is resolved from the approved source and any review is complete.", "provider.documents.receivedTitle": "Document received", "provider.documents.receivedBody": "Your document was securely recorded for review.", "provider.documents.uploadFailedTitle": "Document could not be uploaded", "provider.documents.unsupportedTitle": "Unsupported file", "provider.documents.unsupportedBody": "Select a PDF, JPG, PNG or WEBP document.", "provider.documents.fileTooLargeTitle": "File is too large", "provider.documents.fileTooLargeBody": "A document can be at most 10 MB.", "provider.documents.readFailedTitle": "Document could not be read", "provider.documents.readFailedBody": "The selected file could not be read", "provider.documents.upload": "Upload document", "provider.documents.update": "Update document", "provider.documents.uploading": "Uploading document", "provider.documents.notUploaded": "Not uploaded yet", "provider.documents.approved": "Approved", "provider.documents.rejected": "Rejected", "provider.documents.pendingReview": "Pending review",
  "provider.documents.scopeReviewTitle": "Credential scope review is pending", "provider.documents.scopeReviewBody": "Document upload is safely unavailable until the selected service scope, jurisdiction, and operating model are verified by the approved source.", "provider.documents.scopeCapabilitiesTitle": "Service-scope credentials", "provider.documents.scopeCapabilitiesBody": "This list contains no category assumption. It is resolved by the server for the selected capability, country, and operating model. Service activation stays blocked until any human review is complete.", "provider.documents.workingModel": "Operating model", "provider.documents.assurance": "assurance", "provider.documents.status": "Status", "provider.documents.statusRequired": "required", "provider.documents.statusConditional": "conditional", "provider.documents.statusProhibited": "unavailable", "provider.documents.statusNotRequired": "not required", "provider.documents.statusLegalReview": "legal review required", "provider.documents.humanReview": "human review",
  "ai.policy.safetyBlocked": "This request requires a safety review. If there is immediate danger, call your local emergency service.", "ai.policy.safetySuggestion": "Review safety information", "ai.policy.contactSupportSuggestion": "Contact support", "ai.policy.draftCreated": "A service draft is ready for {service}. Review the details before you confirm it.", "ai.policy.reviewDraft": "Review request", "ai.policy.addDetail": "Add details", "ai.policy.confirmDraft": "Confirm draft", "ai.policy.needDetails": "Share a little more detail about what you need so that a service draft can be prepared.", "ai.policy.specifyService": "Specify the service type", "ai.policy.addLocation": "Add location", "ai.policy.shareTiming": "Share a time preference",
};

const p17ClosureTurkishTranslations: Record<P17ClosureTranslationKey, string> = {
  "organization.title": "Kurumsal Yönetim", "organization.subtitle": "Tesis, araç ve planlı bakım", "organization.none": "Aktif kurumsal üyeliğiniz yok.", "organization.sites": "Lokasyonlar", "organization.assets": "Varlıklar", "organization.schedules": "Bakım Takvimi", "organization.batches": "Toplu İş Talepleri", "organization.invoices": "Kurumsal Faturalar", "organization.loading": "Kurumsal veriler yükleniyor…", "organization.noSites": "Lokasyon eklenmemiş", "organization.noAssets": "Kayıtlı varlık yok", "organization.noSchedules": "Planlı bakım yok", "organization.noBatches": "Toplu iş talebi yok", "organization.noInvoices": "Doğrulanmış ödeme kaynaklı fatura yok", "organization.error": "Kurumsal veriler yüklenemedi.",
  "provider.documents.backAccessibility": "Geri dön", "provider.documents.title": "Profesyonel belgelerim", "provider.documents.secureUploadTitle": "Doğrulama için güvenli belge yükleyin", "provider.documents.secureUploadBody": "Belge gereksinimleri hizmet kapsamınıza göre sunucudan alınır. Dosyalar 10 MB ile sınırlandırılır; içerik türü ve imzası sunucuda doğrulanır.", "provider.documents.requirementsLoading": "Belge gereksinimleri yükleniyor", "provider.documents.requirementsUnavailable": "Belge gereksinimleri alınamadı", "provider.documents.requirementsUnavailableBody": "Güvenli liste yüklenmeden belge yükleme açılamaz.", "provider.documents.retry": "Tekrar dene", "provider.documents.uploadDisabled": "Belge yükleme kapalı", "provider.documents.uploadDisabledBody": "Kapsam kaynaktan çözümlenmeden veya gerekli inceleme tamamlanmadan belge yükleyemezsiniz.", "provider.documents.receivedTitle": "Belge alındı", "provider.documents.receivedBody": "Belgeniz incelenmek üzere güvenli biçimde kaydedildi.", "provider.documents.uploadFailedTitle": "Belge yüklenemedi", "provider.documents.unsupportedTitle": "Desteklenmeyen dosya", "provider.documents.unsupportedBody": "PDF, JPG, PNG veya WEBP türünde belge seçin.", "provider.documents.fileTooLargeTitle": "Dosya büyük", "provider.documents.fileTooLargeBody": "Belge en fazla 10 MB olabilir.", "provider.documents.readFailedTitle": "Belge okunamadı", "provider.documents.readFailedBody": "Seçilen dosya okunamadı", "provider.documents.upload": "Belge yükle", "provider.documents.update": "Belgeyi güncelle", "provider.documents.uploading": "Belge yükleniyor", "provider.documents.notUploaded": "Henüz yüklenmedi", "provider.documents.approved": "Onaylandı", "provider.documents.rejected": "Reddedildi", "provider.documents.pendingReview": "İnceleme bekliyor",
  "provider.documents.scopeReviewTitle": "Yetkinlik belgesi incelemesi bekliyor", "provider.documents.scopeReviewBody": "Seçili hizmet kapsamı, yetki bölgesi veya çalışma modeli henüz kaynaktan doğrulanmadığı için belge yükleme güvenli biçimde kapalıdır.", "provider.documents.scopeCapabilitiesTitle": "Hizmet kapsamı yetkinlikleri", "provider.documents.scopeCapabilitiesBody": "Bu liste kategori varsayımı içermez; seçili yetkinlik, ülke ve çalışma modeline göre sunucudan çözülür. İnsan incelemesi tamamlanmadan hizmet aktifleştirilmez.", "provider.documents.workingModel": "Çalışma modeli", "provider.documents.assurance": "güvence", "provider.documents.status": "Durum", "provider.documents.statusRequired": "zorunlu", "provider.documents.statusConditional": "koşullu", "provider.documents.statusProhibited": "kullanılamaz", "provider.documents.statusNotRequired": "zorunlu değil", "provider.documents.statusLegalReview": "hukuki inceleme gerekli", "provider.documents.humanReview": "insan incelemesi",
  "ai.policy.safetyBlocked": "Bu talep güvenlik incelemesi gerektiriyor. Acil tehlike varsa yerel acil yardım hattını arayın.", "ai.policy.safetySuggestion": "Güvenlik bilgilerini kontrol et", "ai.policy.contactSupportSuggestion": "Destek ekibiyle iletişime geç", "ai.policy.draftCreated": "{service} için bir hizmet taslağı hazırladım. Ayrıntıları kontrol edip onaylayabilirsiniz.", "ai.policy.reviewDraft": "Talebi gözden geçir", "ai.policy.addDetail": "Ayrıntı ekle", "ai.policy.confirmDraft": "Taslağı onayla", "ai.policy.needDetails": "Size uygun bir hizmet taslağı hazırlayabilmem için ihtiyacınızla ilgili biraz daha ayrıntı paylaşın.", "ai.policy.specifyService": "Hizmet türünü belirt", "ai.policy.addLocation": "Konumu ekle", "ai.policy.shareTiming": "Zaman tercihini paylaş",
};

const translations: Partial<Record<Language, Dictionary>> = {
  tr: {
    home: "Ana Sayfa", explore: "Keşfet", myJobs: "İşlerim", messages: "Mesajlar", profile: "Profil", search: "Hizmet veya usta ara...", categories: "Hizmet Kategorileri", topRated: "En Yüksek Puanlı", viewAll: "Tümü", serviceRequest: "Hizmet Talebi", findProvider: "Usta Bul", login: "Giriş Yap", register: "Kayıt Ol", logout: "Çıkış Yap", settings: "Ayarlar", premium: "Premium Üyelik", notifications: "Bildirimler", aiAssistant: "MoveAI Asistan", active: "Aktif", pending: "Bekleyen", completed: "Tamamlanan", cancelled: "İptal", language: "Dil", currency: "Para Birimi", wallet: "MoveWallet", restartRequired: "Yön değişikliğinin uygulanması için uygulamayı yeniden açın.", settingsSecurity: "Ayarlar ve Güvenlik", darkMode: "Karanlık Mod", activeDevices: "Aktif Cihazlar", about: "Hakkında", privacyPolicy: "Gizlilik Politikası", terms: "Kullanım Koşulları", logoutConfirmTitle: "Çıkış Yap", logoutConfirmBody: "Hesabınızdan çıkış yapmak istediğinize emin misiniz?", cancel: "İptal", currencyTry: "₺ TRY", currencyUsd: "$ USD", currencyEur: "€ EUR", currencyUnavailableTitle: "Kur dönüşümü hazır değil", currencyUnavailableBody: "{currency} görüntüleme ve ödeme için onaylı bir kur sağlayıcısı yapılandırılmadı. Tüm tutarlar güvenle TRY olarak kalır.", currencySettlementNotice: "Ödemeler ve cüzdan bakiyesi yalnız TRY üzerinden uzlaştırılır.", version: "Move&Fix v1.0.0", languageSelectionHelp: "Uygulama dilini seçin. Arapça yön değişikliğinin tamamlanması için uygulamayı yeniden açmanız gerekir.", back: "Geri dön", security: "Güvenlik", "home.greeting": "Merhaba {name} 👋", "home.defaultName": "Kullanıcı", "home.subtitle": "Bugün sana nasıl yardımcı olabilirim?", "home.searchPlaceholder": "Ne arıyorsun?", "home.moveAITitle": "MoveAI ile anlat", "home.moveAISubtitle": "Doğal dille söyle, biz halledelim", "home.quickAccess": "Hızlı Erişim", "home.activeJob": "Aktif İş", "home.nearbyProviders": "Yakındaki Ustalar", "home.popularServices": "Popüler Hizmetler", "home.noNearbyProviders": "Yakında profesyonel bulunamadı", "home.quickAccess_emergency": "Acil Yardım", "home.quickAccess_vehicle": "Araç", "home.quickAccess_home": "Ev", "home.quickAccess_moving": "Taşıma", "home.service.cleaning": "Temizlik", "home.service.plumbing": "Su Tesisatı", "home.service.electricity": "Elektrik", "home.service.airConditioning": "Klima", "home.serviceCount": "{count} hizmet", "common.seeAll": "Tümü", "explore.title": "Ne arıyorsun?", "explore.all": "Tümü", "explore.emergency": "Acil", "explore.vehicle": "Araç", "explore.loadingServices": "Hizmetler yükleniyor...", "explore.categoriesFailed": "Kategoriler yüklenemedi", "explore.retry": "Yeniden dene", "explore.noServices": "Aramana uygun hizmet bulunamadı.", "explore.recommendedProviders": "Önerilen Ustalar", "explore.loadingProvidersFailed": "Profesyoneller yüklenemedi. Yeniden dene.", "explore.noProviders": "Uygun profesyonel bulunamadı.", "explore.providerCount": "{count} profesyonel", "explore.moveScore": "MoveScore {score}"
  },
  en: {
    home: "Home", explore: "Explore", myJobs: "My Jobs", messages: "Messages", profile: "Profile", search: "Search for services or providers...", categories: "Service Categories", topRated: "Top Rated", viewAll: "View All", serviceRequest: "Service Request", findProvider: "Find Provider", login: "Login", register: "Register", logout: "Log out", settings: "Settings", premium: "Premium Membership", notifications: "Notifications", aiAssistant: "MoveAI Assistant", active: "Active", pending: "Pending", completed: "Completed", cancelled: "Cancelled", language: "Language", currency: "Currency", wallet: "MoveWallet", restartRequired: "Reopen the app to apply the direction change.", settingsSecurity: "Settings & Security", darkMode: "Dark Mode", activeDevices: "Active Devices", about: "About", privacyPolicy: "Privacy Policy", terms: "Terms of Use", logoutConfirmTitle: "Log out", logoutConfirmBody: "Are you sure you want to sign out of your account?", cancel: "Cancel", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Choose the app language. Reopen the app to fully apply Arabic right-to-left direction.", back: "Go back", security: "Security", "home.greeting": "Hello {name} 👋", "home.defaultName": "Customer", "home.subtitle": "How can I help you today?", "home.searchPlaceholder": "What are you looking for?", "home.moveAITitle": "Tell MoveAI", "home.moveAISubtitle": "Say it naturally, we’ll handle it", "home.quickAccess": "Quick Access", "home.activeJob": "Active Job", "home.nearbyProviders": "Nearby Providers", "home.popularServices": "Popular Services", "home.noNearbyProviders": "No nearby providers found", "home.quickAccess_emergency": "Emergency", "home.quickAccess_vehicle": "Vehicle", "home.quickAccess_home": "Home", "home.quickAccess_moving": "Moving", "home.service.cleaning": "Cleaning", "home.service.plumbing": "Plumbing", "home.service.electricity": "Electrical", "home.service.airConditioning": "Air Conditioning", "home.serviceCount": "{count} services", "common.seeAll": "See All", "explore.title": "What are you looking for?", "explore.all": "All", "explore.emergency": "Emergency", "explore.vehicle": "Vehicle", "explore.loadingServices": "Loading services...", "explore.categoriesFailed": "Categories could not be loaded", "explore.retry": "Try again", "explore.noServices": "No services match your search.", "explore.recommendedProviders": "Recommended Providers", "explore.loadingProvidersFailed": "Providers could not be loaded. Try again.", "explore.noProviders": "No suitable providers found.", "explore.providerCount": "{count} providers", "explore.moveScore": "MoveScore {score}"
  },
  de: {
    home: "Startseite", explore: "Entdecken", myJobs: "Meine Aufträge", messages: "Nachrichten", profile: "Profil", search: "Dienste oder Anbieter suchen...", categories: "Dienstkategorien", topRated: "Am besten bewertet", viewAll: "Alle anzeigen", serviceRequest: "Serviceanfrage", findProvider: "Anbieter finden", login: "Anmelden", register: "Registrieren", logout: "Abmelden", settings: "Einstellungen", premium: "Premium-Mitgliedschaft", notifications: "Benachrichtigungen", aiAssistant: "MoveAI Assistent", active: "Aktiv", pending: "Ausstehend", completed: "Abgeschlossen", cancelled: "Storniert", language: "Sprache", currency: "Währung", wallet: "MoveWallet", restartRequired: "Öffnen Sie die App erneut, um die Richtungsänderung anzuwenden.", settingsSecurity: "Einstellungen & Sicherheit", darkMode: "Dunkler Modus", activeDevices: "Aktive Geräte", about: "Über", privacyPolicy: "Datenschutz", terms: "Nutzungsbedingungen", logoutConfirmTitle: "Abmelden", logoutConfirmBody: "Möchten Sie sich wirklich abmelden?", cancel: "Abbrechen", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Wählen Sie die App-Sprache. Öffnen Sie die App erneut, um die arabische Schreibrichtung vollständig anzuwenden.", back: "Zurück", security: "Sicherheit"
  },
  fr: {
    home: "Accueil", explore: "Explorer", myJobs: "Mes travaux", messages: "Messages", profile: "Profil", search: "Rechercher des services ou prestataires...", categories: "Catégories de services", topRated: "Les mieux notés", viewAll: "Voir tout", serviceRequest: "Demande de service", findProvider: "Trouver un prestataire", login: "Connexion", register: "Inscription", logout: "Déconnexion", settings: "Paramètres", premium: "Abonnement Premium", notifications: "Notifications", aiAssistant: "Assistant MoveAI", active: "Actif", pending: "En attente", completed: "Terminé", cancelled: "Annulé", language: "Langue", currency: "Devise", wallet: "MoveWallet", restartRequired: "Rouvrez l’application pour appliquer le changement de direction.", settingsSecurity: "Paramètres et sécurité", darkMode: "Mode sombre", activeDevices: "Appareils actifs", about: "À propos", privacyPolicy: "Politique de confidentialité", terms: "Conditions d’utilisation", logoutConfirmTitle: "Déconnexion", logoutConfirmBody: "Voulez-vous vraiment vous déconnecter ?", cancel: "Annuler", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Choisissez la langue de l’application. Rouvrez l’application pour appliquer complètement la direction arabe de droite à gauche.", back: "Retour", security: "Sécurité"
  },
  ar: {
    home: "الرئيسية", explore: "استكشاف", myJobs: "أعمالي", messages: "الرسائل", profile: "الملف الشخصي", search: "ابحث عن خدمات أو مقدمي خدمات...", categories: "فئات الخدمات", topRated: "الأعلى تقييماً", viewAll: "عرض الكل", serviceRequest: "طلب خدمة", findProvider: "ابحث عن مقدم خدمة", login: "تسجيل الدخول", register: "إنشاء حساب", logout: "تسجيل الخروج", settings: "الإعدادات", premium: "العضوية المميزة", notifications: "الإشعارات", aiAssistant: "مساعد MoveAI", active: "نشط", pending: "قيد الانتظار", completed: "مكتمل", cancelled: "ملغى", language: "اللغة", currency: "العملة", wallet: "محفظة موف", restartRequired: "أعد فتح التطبيق لتطبيق تغيير الاتجاه.", settingsSecurity: "الإعدادات والأمان", darkMode: "الوضع الداكن", activeDevices: "الأجهزة النشطة", about: "حول", privacyPolicy: "سياسة الخصوصية", terms: "شروط الاستخدام", logoutConfirmTitle: "تسجيل الخروج", logoutConfirmBody: "هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟", cancel: "إلغاء", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "اختر لغة التطبيق. أعد فتح التطبيق لتطبيق اتجاه العربية من اليمين إلى اليسار بالكامل.", back: "رجوع", security: "الأمان"
  },
  ru: {
    home: "Главная", explore: "Каталог", myJobs: "Мои заказы", messages: "Сообщения", profile: "Профиль", search: "Поиск услуг или специалистов...", categories: "Категории услуг", topRated: "С высоким рейтингом", viewAll: "Все", serviceRequest: "Заявка на услугу", findProvider: "Найти специалиста", login: "Войти", register: "Регистрация", logout: "Выйти", settings: "Настройки", premium: "Премиум-подписка", notifications: "Уведомления", aiAssistant: "Ассистент MoveAI", active: "Активно", pending: "Ожидает", completed: "Завершено", cancelled: "Отменено", language: "Язык", currency: "Валюта", wallet: "MoveWallet", restartRequired: "Перезапустите приложение, чтобы применить изменение направления.", settingsSecurity: "Настройки и безопасность", darkMode: "Тёмный режим", activeDevices: "Активные устройства", about: "О приложении", privacyPolicy: "Политика конфиденциальности", terms: "Условия использования", logoutConfirmTitle: "Выйти", logoutConfirmBody: "Вы действительно хотите выйти из аккаунта?", cancel: "Отмена", currencyTry: "₺ TRY", version: "Move&Fix v1.0.0", languageSelectionHelp: "Выберите язык приложения. Чтобы полностью применить арабское направление справа налево, перезапустите приложение.", back: "Назад", security: "Безопасность", "home.greeting": "Привет, {name} 👋", "home.defaultName": "Пользователь", "home.subtitle": "Чем могу помочь сегодня?", "home.searchPlaceholder": "Что ищете?", "home.moveAITitle": "Расскажите MoveAI", "home.moveAISubtitle": "Скажите естественно, мы разберёмся", "home.quickAccess": "Быстрый доступ", "home.activeJob": "Активная работа", "home.nearbyProviders": "Ближайшие мастера", "home.popularServices": "Популярные услуги", "home.noNearbyProviders": "Поблизости нет мастеров", "home.quickAccess_emergency": "Экстренная помощь", "home.quickAccess_vehicle": "Транспорт", "home.quickAccess_home": "Дом", "home.quickAccess_moving": "Переезд", "home.service.cleaning": "Уборка", "home.service.plumbing": "Сантехника", "home.service.electricity": "Электрика", "home.service.airConditioning": "Кондиционирование", "home.serviceCount": "Услуг: {count}", "common.seeAll": "Все", "explore.title": "Что ищете?", "explore.all": "Все", "explore.emergency": "Экстренно", "explore.vehicle": "Транспорт", "explore.loadingServices": "Загрузка услуг...", "explore.categoriesFailed": "Не удалось загрузить категории", "explore.retry": "Повторить", "explore.noServices": "Нет услуг по вашему запросу.", "explore.recommendedProviders": "Рекомендуемые мастера", "explore.loadingProvidersFailed": "Не удалось загрузить мастеров. Повторите попытку.", "explore.noProviders": "Подходящие мастера не найдены.", "explore.providerCount": "Мастеров: {count}", "explore.moveScore": "MoveScore {score}"
  },
};

const chatPreferenceFallbackTranslations: Record<`chat.${string}`, string> = {
  "chat.autoTranslateTitle": "Automatically translate incoming messages",
  "chat.autoTranslateBody": "Only messages sent to you are translated. You can always view the original.",
  "chat.autoTranslateEnabled": "Automatic translation is on",
  "chat.autoTranslateDisabled": "Automatic translation is off",
  "chat.autoTranslateSaveError": "Your translation preference could not be saved. Please try again.",
  "chat.backAccessibility": "Go back",
  "chat.inputHint": "Write your message and press the send button",
  "chat.expenseFile": "Expense file",
  "chat.expenseFileAccessibility": "View the expense file for this job",
  "chat.expenseFileHint": "Opens expenses connected only to this conversation’s service request",
};

const chatPreferenceTurkishTranslations: Record<`chat.${string}`, string> = {
  "chat.autoTranslateTitle": "Gelen mesajları otomatik çevir",
  "chat.autoTranslateBody": "Yalnızca size gönderilen mesajlar çevrilir. Orijinal metni her zaman görüntüleyebilirsiniz.",
  "chat.autoTranslateEnabled": "Otomatik çeviri açık",
  "chat.autoTranslateDisabled": "Otomatik çeviri kapalı",
  "chat.autoTranslateSaveError": "Çeviri tercihiniz kaydedilemedi. Lütfen tekrar deneyin.",
  "chat.backAccessibility": "Geri dön",
  "chat.inputHint": "Mesajınızı yazın ve gönder düğmesine basın",
  "chat.expenseFile": "Masraf Dosyası",
  "chat.expenseFileAccessibility": "Bu işin Masraf Dosyası’nı görüntüle",
  "chat.expenseFileHint": "Yalnız bu sohbetteki hizmet talebine bağlı masrafları açar",
};

const extraTranslations: Partial<Record<Language, Dictionary>> = {
  tr: {
    "consent.title": "Yasal Onaylar",
    "consent.requiredHint": "Devam etmek için aşağıdaki tüm maddeleri onaylamanız gerekmektedir.",
    "consent.readText": "Metni oku →",
    "consent.createAccount": "Hesap Oluştur",
    "consent.acceptAll": "Tüm maddeleri onaylayın",
    "privacy.title": "Move&Fix Gizlilik Politikası",
    "privacy.updated": "Son güncelleme",
    "privacy.publicDescription": "Move&Fix gizlilik politikası ve kişisel veri işleme bilgileri.",
    "privacy.publicNotice": "Bu sayfa giriş gerektirmeden herkese açıktır.",
    "privacy.approvedText": "Onaylı metin",
    "privacy.pendingLegalReviewTitle": "Hukuk incelemesi bekleniyor",
    "privacy.pendingLegalReviewBody": "İngilizce çeviri erişilebilirlik için sunulmaktadır. Hukuk incelemesi tamamlanana kadar Türkçe politika onaylı ve esas metindir.",
    "privacy.tabAccessibility": "{language} gizlilik politikası",
    "privacy.tabHint": "Gizlilik politikası görüntüleme dilini değiştirir",
    currencyUsd: "$ USD",
    currencyEur: "€ EUR",
    currencyUnavailableTitle: "Kur dönüşümü hazır değil",
    currencyUnavailableBody: "{currency} görüntüleme ve ödeme için onaylı bir kur sağlayıcısı yapılandırılmadı. Tüm tutarlar güvenle TRY olarak kalır.",
    currencySettlementNotice: "Ödemeler ve cüzdan bakiyesi yalnız TRY üzerinden uzlaştırılır.",
    "ai.welcome": "Merhaba! Ben MoveAI 🤖 Size nasıl yardımcı olabilirim? Acil bir sorun mu var, hizmet mi arıyorsunuz?",
    "ai.online": "Çevrimiçi", "ai.thinking": "MoveAI düşünüyor...", "ai.inputPlaceholder": "Sorunuzu yazın...",
    "ai.fallback": "Size yardımcı olmaya çalışıyorum. Lütfen biraz daha açıklayıcı olur musunuz?",
    "ai.requestCreatedTitle": "Hizmet Talebi Oluşturuldu", "ai.requestCreatedBody": "MoveAI talebinizi oluşturdu. Şimdi uygun ustaları görüntülemek ister misiniz?",
    "ai.later": "Sonra", "ai.viewProviders": "Ustaları Gör", "ai.draftReady": "Taslak hazır. Hizmet talebi yalnızca onayınızla oluşturulur.", "ai.confirmDraft": "Taslağı onayla", "ai.confirmingDraft": "Onaylanıyor…", "ai.chooseCountry": "Hizmetin sunulacağı ülkeyi seçin", "ai.countryUnavailable": "Şu anda kullanılabilir bir ülke bulunmuyor.", "ai.countryLoading": "Ülke kullanılabilirliği doğrulanıyor…", "ai.prompt.plumbing": "Evimin suyu akıyor",
    "ai.prompt.roadside": "Arabam yolda kaldı", "ai.prompt.airConditioning": "Klima soğutmuyor", "ai.prompt.towTruck": "Çekici lazım",
    "ai.prompt.courier": "Kurye lazım", "ai.prompt.priceEstimate": "Fiyat tahmini",
    "wallet.loading": "MoveWallet yükleniyor…", "wallet.loadFailedTitle": "Cüzdan bilgileri alınamadı", "wallet.loadFailedBody": "Güvenli bağlantınızı kontrol edip yeniden deneyin.",
    "wallet.retry": "Yeniden Dene", "wallet.retryAccessibility": "Cüzdan bilgilerini yeniden yükle", "wallet.historyAccessibility": "MoveWallet işlem geçmişini aç",
    "wallet.balance": "Bakiye", "wallet.pendingEscrow": "Emanette bekleyen {amount}", "wallet.addMoney": "Para Ekle", "wallet.withdraw": "Para Çek",
    "wallet.history": "İşlem Geçmişi", "wallet.recentTransactions": "Son İşlemler", "wallet.allTransactionsAccessibility": "Tüm cüzdan işlemlerini görüntüle",
    "wallet.emptyTitle": "Henüz cüzdan işlemi yok", "wallet.emptyBody": "Ödeme, iade ve para çekme kayıtları burada görüntülenecek.",
    "profile.defaultName": "Move&Fix Kullanıcısı", "profile.defaultMember": "Move&Fix üyesi", "profile.reviewCount": "{count} değerlendirme",
    "profile.personalInfo": "Kişisel Bilgiler", "profile.addresses": "Adreslerim", "profile.paymentMethods": "Ödeme Yöntemleri",
    "profile.favorites": "Favoriler", "profile.pastJobs": "Geçmiş İşler", "profile.settingsSecurity": "Ayarlar & Güvenlik",
    "checkout.invalidLink": "Geçersiz ödeme bağlantısı", "checkout.invalidLinkBody": "İş numarası eksik veya hatalı.", "checkout.loadingQuote": "Güvenli ödeme özeti hazırlanıyor…", "checkout.quoteUnavailable": "Ödeme özeti alınamadı",
    "checkout.serviceSummary": "Hizmet Özeti", "checkout.provider": "Profesyonel: {name}", "checkout.total": "Toplam", "checkout.escrowGuarantee": "Move&Fix Emanet Güvencesi", "checkout.feeBreakdown": "Ücret Dökümü", "checkout.priceGuaranteeTitle": "Sürpriz fiyat yok", "checkout.priceGuaranteeBody": "Onaylanan tutar, yazılı değişiklik emri olmadan artırılamaz.", "checkout.priceGuaranteeMaximum": "Maksimum tutar",
    "checkout.serviceFee": "Hizmet bedeli", "checkout.platformCommission": "Platform komisyonu (%{rate})", "checkout.commissionInfo": "Komisyon hizmet bedelinden kesilir; müşteriye ayrıca yansıtılmaz.", "checkout.totalPayable": "Ödenecek Toplam", "checkout.paymentMethod": "Ödeme Yöntemi",
    "checkout.walletVerifying": "Bakiye doğrulanıyor…", "checkout.walletUnavailable": "Bakiye alınamadı · Ödeme BLOCKER", "checkout.walletAvailable": "Kullanılabilir: {amount} · Ödeme BLOCKER", "checkout.walletBlocked": "Ödeme BLOCKER",
    "checkout.iyzicoSubtitle": "Türkiye için güvenli hosted checkout", "checkout.stripeReady": "Uluslararası kart · PaymentSheet", "checkout.stripeBlocked": "Publishable key BLOCKER", "checkout.billingInfo": "Fatura Bilgileri", "checkout.billingInfoBody": "Kart bilgileri Move&Fix’e girilmez. Bu bilgiler iyzico oturumunu açmak için şifreli bağlantıyla sunucuya gönderilir.",
    "checkout.phonePlaceholder": "Cep telefonu (05xx xxx xx xx)", "checkout.identityPlaceholder": "T.C. kimlik numarası", "checkout.addressPlaceholder": "Fatura adresi", "checkout.cityPlaceholder": "Şehir", "checkout.zipPlaceholder": "Posta kodu",
    "checkout.securityNotice": "Tutar ve komisyon yalnızca sunucudaki kabul edilmiş tekliften hesaplanır. Emanet durumu sadece doğrulanmış webhook ile değişir.", "checkout.title": "Güvenli Ödeme", "checkout.processing": "Güvenli oturum hazırlanıyor…", "checkout.payWith": "{provider} ile {amount} Öde",
    "provider.dashboardLoading": "Panel hazırlanıyor...", "provider.dashboardUnavailable": "Panel verileri yüklenemedi", "provider.dashboardUnavailableBody": "Profesyonel profilinizi ve bağlantınızı kontrol edip tekrar deneyin.", "provider.today": "Bugün",
    "provider.todayEarnings": "Bugünkü Kazanç", "provider.totalEarnings": "Toplam kazanç: {amount}", "provider.activeJobs": "Aktif İş", "provider.newOffers": "Yeni Teklif", "provider.availability": "Müsaitlik", "provider.cockpitTitle": "İş Kokpiti", "provider.pendingPayments": "Bekleyen ödeme", "provider.averageRating": "Ortalama puan", "provider.cancellationRate": "İptal oranı", "provider.metricUnavailable": "Henüz veri yok",
    "provider.available": "Müsait", "provider.unavailable": "Kapalı", "provider.menuNewJobs": "Yeni İşler", "provider.menuActiveJobs": "Aktif İşler", "provider.menuCalendar": "Takvim",
    "provider.menuEarnings": "Kazançlar", "provider.menuMessages": "Mesajlar", "provider.menuProfile": "Profil",
    "messages.title": "Mesajlar", "messages.subtitle": "Profesyonellerle görüşmeleriniz", "messages.loading": "Mesajlar yükleniyor...",
    "messages.errorTitle": "Mesajlar yüklenemedi", "messages.errorBody": "Bağlantınızı kontrol edip yeniden deneyin.", "messages.retry": "Tekrar Dene",
    "messages.emptyTitle": "Henüz mesajınız yok", "messages.emptyBody": "Bir profesyonelle iletişime geçtiğinizde görüşmeniz burada görünür.",
    "tracking.timeline.scheduled": "Planlandı", "tracking.timeline.onTheWay": "Yolda", "tracking.timeline.arrived": "Ulaştı", "tracking.timeline.inProgress": "İş Başladı", "tracking.timeline.completed": "Tamamlandı",
    "tracking.action.depart": "Yola Çık", "tracking.action.arrived": "Adrese Ulaştım", "tracking.action.start": "İşi Başlat", "tracking.action.complete": "İşi Tamamla",
    "tracking.status.scheduledTitle": "Planlandı", "tracking.status.scheduledSubtitle": "Profesyonel hizmet için hazırlanıyor", "tracking.status.onTheWayTitle": "Yolda", "tracking.status.onTheWaySubtitle": "Profesyonel konumunuza geliyor", "tracking.status.etaSubtitle": "Tahmini varış {minutes} dakika",
    "tracking.status.arrivedTitle": "Adrese Ulaştı", "tracking.status.arrivedSubtitle": "Profesyonel hizmet adresinde", "tracking.status.inProgressTitle": "Hizmet Devam Ediyor", "tracking.status.inProgressSubtitle": "İşlem profesyonel tarafından başlatıldı", "tracking.status.completedTitle": "Hizmet Tamamlandı", "tracking.status.completedSubtitle": "Deneyiminizi değerlendirebilirsiniz", "tracking.status.cancelledTitle": "İş İptal Edildi", "tracking.status.cancelledSubtitle": "Bu iş için canlı takip sonlandırıldı",
    "tracking.invalidLinkTitle": "Geçersiz iş bağlantısı", "tracking.invalidLinkBody": "Canlı takip için geçerli bir iş numarası gerekiyor.", "tracking.back": "Geri Dön", "tracking.loading": "Aktif iş yükleniyor…", "tracking.accessErrorTitle": "Aktif iş açılamadı", "tracking.accessErrorBody": "Bu işe erişiminiz bulunmuyor veya iş artık mevcut değil.", "tracking.retry": "Tekrar Dene",
    "tracking.headerTitle": "Aktif İş", "tracking.minuteShort": "dk", "tracking.providerFallback": "Atanmış profesyonel", "tracking.serviceFallback": "Hizmet", "tracking.noLocation": "Henüz konum paylaşılmadı", "tracking.locationUnknown": "Güncelleme zamanı bilinmiyor", "tracking.lastUpdated": "Son güncelleme {time}", "tracking.jobsCount": "{count} iş",
    "tracking.messagingUnavailable": "Mesaj kullanılamıyor", "tracking.messagingUnavailableBody": "Atanmış profesyonelin kullanıcı kaydı bulunamadı.", "tracking.serviceDetail": "Hizmet Detayı", "tracking.service": "Hizmet", "tracking.address": "Adres", "tracking.addressMissing": "Adres paylaşılmadı", "tracking.jobStatus": "İş Durumu",
    "tracking.proofTitle": "İş Kanıtı", "tracking.proofHint": "İşi bitirdiğinizi fotoğraf veya video ile belgeleyin. Müşterinin yanıt süresi 48 saattir.", "tracking.aiDisclosure": "Gönderdiğiniz görseller, yalnız incelemeyi desteklemek üzere MoveAI tarafından analiz edilebilir. Analiz onay veya ödeme kararı vermez.", "tracking.proofPlaceholder": "Yapılan işlemi açıklayın", "tracking.addProofMedia": "Fotoğraf veya Video Ekle", "tracking.submitProof": "İş Kanıtını Gönder", "tracking.proofStatus": "İş Kanıtı Durumu", "tracking.proofDisputed": "İtiraz açık. Emanet tutarı yönetici çözümünü bekliyor.", "tracking.proofExpired": "Müşteri yanıt süresi doldu; emanet serbest bırakma işlemi sıraya alındı.", "tracking.proofRespond": "Kanıtı inceleyip işi onaylayın veya itiraz oluşturun.", "tracking.proofRecorded": "İş kanıtı kaydedildi.",
    "tracking.aiNote": "MoveAI inceleme notu", "tracking.aiConfidence": "Güven {value}", "tracking.aiDecisionDisclosure": "Bu otomatik değerlendirme yalnız karar desteğidir; müşteri onayı, itiraz veya yönetici kararı yerine geçmez.", "tracking.approveJob": "İşi Onayla", "tracking.createDispute": "İtiraz Oluştur", "tracking.disputePlaceholder": "İtiraz nedeninizi açıklayın", "tracking.submitDispute": "İtirazı Gönder", "tracking.stopSharing": "Konum Paylaşımını Durdur", "tracking.shareLocation": "Canlı Konumu Paylaş", "tracking.reviewService": "Hizmeti Değerlendir"
    ,"jobs.filter.active": "Aktif", "jobs.filter.offers": "Teklifler", "jobs.filter.scheduled": "Planlanan", "jobs.filter.completed": "Tamamlanan",
    "jobs.status.offers": "Teklif Bekliyor", "jobs.status.scheduled": "Planlandı", "jobs.status.onTheWay": "Yolda", "jobs.status.arrived": "Geldi", "jobs.status.inProgress": "İş Başladı", "jobs.status.completed": "Tamamlandı", "jobs.status.cancelled": "İptal",
    "jobs.action.viewOffers": "Teklifleri Gör", "jobs.action.track": "İşi Takip Et", "jobs.action.viewDetail": "Detayı Gör", "jobs.serviceFallback": "Hizmet", "jobs.provider": "Profesyonel", "jobs.minuteShort": "dk", "jobs.chatAccessibility": "{name} ile mesajlaş",
    "jobs.acceptedOffer": "Kabul Edilen Teklif", "jobs.budget": "Bütçe", "jobs.waitingOffer": "Teklif bekleniyor", "jobs.title": "İşlerim", "jobs.subtitle": "Tüm hizmetlerini tek yerden takip et", "jobs.loading": "İşlerin yükleniyor...", "jobs.errorTitle": "İşlerin alınamadı", "jobs.retry": "Tekrar Dene", "jobs.emptyTitle": "Bu bölümde iş yok", "jobs.emptyBody": "Durumu değişen hizmetlerin burada otomatik olarak görünür.", "jobs.newRequest": "Yeni Talep Oluştur",
    "chat.providerFallback": "Profesyonel", "chat.providerMeta": "Profesyonel · {rating} puan", "chat.userMeta": "Move&Fix kullanıcısı", "chat.invalidContext": "Bu sohbet için geçerli bir hizmet kaydı gerekli.", "chat.loading": "Mesajlar yükleniyor...", "chat.loadError": "Mesajlar yüklenemedi", "chat.emptyTitle": "Henüz mesaj yok", "chat.emptyBody": "İlk mesajı gönderin", "chat.sendError": "Mesaj gönderilemedi. Lütfen tekrar deneyin.", "chat.voiceSendError": "Sesli mesaj gönderilemedi. Lütfen tekrar deneyin.", "chat.placeholder": "Mesaj yazın...", "chat.stopRecordAndSend": "Ses kaydını bitir ve gönder", "chat.recordVoice": "Sesli mesaj kaydet", "chat.translate": "Çevir", "chat.showOriginal": "Orijinali göster", "chat.showTranslation": "Çeviriyi göster", "chat.hideForMe": "Benden gizle", "chat.translationUnavailable": "Çeviri şu anda kullanılamıyor.", "chat.hidden": "Mesaj görünümünüzden gizlendi.",
    "opportunities.offerSentTitle": "Teklif Gönderildi", "opportunities.offerSentBody": "Müşteri teklifiniz hakkında bilgilendirildi.", "opportunities.offerFailedTitle": "Teklif Gönderilemedi", "opportunities.retry": "Lütfen tekrar deneyin.", "opportunities.profileRequiredTitle": "Profil Gerekli", "opportunities.profileRequiredBody": "Teklif verebilmek için profesyonel profiliniz bulunmalıdır.", "opportunities.invalidAmountTitle": "Geçersiz Tutar", "opportunities.invalidAmountBody": "Lütfen sıfırdan büyük bir teklif tutarı girin.", "opportunities.durationRequiredTitle": "Süre Gerekli", "opportunities.durationRequiredBody": "Tahmini varış veya tamamlama süresini girin.", "opportunities.loading": "İş fırsatları yükleniyor…", "opportunities.errorTitle": "Fırsatlar alınamadı", "opportunities.errorBody": "Bağlantınızı kontrol edip yeniden deneyin.", "opportunities.title": "Yeni İş Fırsatları", "opportunities.emptyTitle": "Yeni fırsat bulunmuyor", "opportunities.emptyBody": "Kategorinize uygun yeni müşteri talepleri burada görünecek.", "opportunities.serviceFallback": "Hizmet talebi", "opportunities.locationMissing": "Konum belirtilmedi", "opportunities.customerBudget": "Müşteri bütçesi", "opportunities.openForOffer": "Teklife açık", "opportunities.close": "Kapat", "opportunities.makeOffer": "Teklif Ver", "opportunities.pricePlaceholder": "Teklif tutarı (₺)", "opportunities.estimatedTimePlaceholder": "Tahmini süre, örn. 30 dakika", "opportunities.messagePlaceholder": "Müşteriye kısa not (isteğe bağlı)", "opportunities.sendOffer": "Teklifi Gönder",
    "security.revokeFailed": "Oturum İptal Edilemedi", "security.sessionsRevokeFailed": "Oturumlar İptal Edilemedi", "security.sessionsRevoked": "Oturumlar Kapatıldı", "security.sessionsRevokedBody": "{count} diğer oturum güvenle iptal edildi.", "security.revokeCurrentTitle": "Bu Cihazdan Çıkış Yap", "security.revokeDeviceTitle": "Cihaz Oturumunu Kapat", "security.revokeCurrentBody": "Bu cihazdaki oturumunuz kapatılacak.", "security.revokeDeviceBody": "Bu cihaz artık hesabınıza erişemeyecek.", "security.cancel": "İptal", "security.revoke": "Oturumu Kapat", "security.revokeOthersTitle": "Diğer Tüm Oturumları Kapat", "security.revokeOthersBody": "Bu cihaz dışındaki tüm aktif oturumlar kapatılacak.", "security.revokeOthers": "Diğerlerini Kapat", "security.back": "Geri dön", "security.title": "Hesap Güvenliği", "security.noticeTitle": "Güvenli oturumlar", "security.noticeBody": "Tanımadığınız cihazları hemen kapatın. Para çekme işlemlerinde parola ile yeniden doğrulama istenir.", "security.activeDevices": "Aktif cihazlar", "security.loadFailed": "Oturumlar yüklenemedi", "security.retry": "Yeniden dene", "security.currentDevice": "Bu cihaz", "security.signedInDevice": "Giriş yapılmış cihaz", "security.active": "Aktif", "security.deviceMissing": "Cihaz bilgisi mevcut değil", "security.closed": "Oturum kapalı", "security.lastActivity": "Son etkinlik: {date}", "security.signOut": "Çıkış", "security.close": "Kapat", "security.noSessions": "Yerel oturum bulunamadı", "security.noSessionsBody": "OAuth oturumları kimlik sağlayıcısı tarafından yönetilir."
  },
  en: {
    "consent.title": "Legal consents",
    "consent.requiredHint": "You must approve all required items below to continue.",
    "consent.readText": "Read text →",
    "consent.createAccount": "Create account",
    "consent.acceptAll": "Approve all required items",
    "privacy.title": "Move&Fix Privacy Policy",
    "privacy.updated": "Last updated",
    "privacy.publicDescription": "Move&Fix privacy policy and personal data processing information.",
    "privacy.publicNotice": "This page is publicly available without sign-in.",
    "privacy.approvedText": "Approved text",
    "privacy.pendingLegalReviewTitle": "Legal review pending",
    "privacy.pendingLegalReviewBody": "This English translation is provided for accessibility. The Turkish policy remains the approved, authoritative version until legal review is completed.",
    "privacy.tabAccessibility": "{language} privacy policy",
    "privacy.tabHint": "Changes the display language of the privacy policy",
    currencyUsd: "$ USD",
    currencyEur: "€ EUR",
    currencyUnavailableTitle: "Currency conversion is not ready",
    currencyUnavailableBody: "An approved exchange-rate provider is not configured for {currency} display or payment. All amounts safely remain in TRY.",
    currencySettlementNotice: "Payments and wallet balances settle in TRY only.",
    "ai.welcome": "Hello! I’m MoveAI 🤖 How can I help you? Is there an emergency, or are you looking for a service?",
    "ai.online": "Online", "ai.thinking": "MoveAI is thinking...", "ai.inputPlaceholder": "Type your question...",
    "ai.fallback": "I’m trying to help. Could you please give me a little more detail?",
    "ai.requestCreatedTitle": "Service Request Created", "ai.requestCreatedBody": "MoveAI created your request. Would you like to see suitable providers now?",
    "ai.later": "Later", "ai.viewProviders": "View Providers", "ai.draftReady": "Your draft is ready. A service request is created only after your confirmation.", "ai.confirmDraft": "Confirm draft", "ai.confirmingDraft": "Confirming…", "ai.chooseCountry": "Select the country where the service will be provided", "ai.countryUnavailable": "There is no available country at this time.", "ai.countryLoading": "Verifying country availability…", "ai.prompt.plumbing": "My home has a water leak",
    "ai.prompt.roadside": "My car broke down", "ai.prompt.airConditioning": "My air conditioner is not cooling", "ai.prompt.towTruck": "I need a tow truck",
    "ai.prompt.courier": "I need a courier", "ai.prompt.priceEstimate": "Get a price estimate",
    "wallet.loading": "Loading MoveWallet…", "wallet.loadFailedTitle": "Wallet details could not be loaded", "wallet.loadFailedBody": "Check your secure connection and try again.",
    "wallet.retry": "Try Again", "wallet.retryAccessibility": "Reload wallet details", "wallet.historyAccessibility": "Open MoveWallet transaction history",
    "wallet.balance": "Balance", "wallet.pendingEscrow": "{amount} pending in escrow", "wallet.addMoney": "Add Money", "wallet.withdraw": "Withdraw",
    "wallet.history": "Transaction History", "wallet.recentTransactions": "Recent Transactions", "wallet.allTransactionsAccessibility": "View all wallet transactions",
    "wallet.emptyTitle": "No wallet transactions yet", "wallet.emptyBody": "Payments, refunds, and withdrawal records will appear here.",
    "profile.defaultName": "Move&Fix Customer", "profile.defaultMember": "Move&Fix member", "profile.reviewCount": "{count} reviews",
    "profile.personalInfo": "Personal Information", "profile.addresses": "My Addresses", "profile.paymentMethods": "Payment Methods",
    "profile.favorites": "Favorites", "profile.pastJobs": "Past Jobs", "profile.settingsSecurity": "Settings & Security",
    "checkout.invalidLink": "Invalid payment link", "checkout.invalidLinkBody": "The job number is missing or invalid.", "checkout.loadingQuote": "Preparing your secure payment summary…", "checkout.quoteUnavailable": "Payment summary could not be loaded",
    "checkout.serviceSummary": "Service Summary", "checkout.provider": "Provider: {name}", "checkout.total": "Total", "checkout.escrowGuarantee": "Move&Fix Escrow Protection", "checkout.feeBreakdown": "Price Breakdown", "checkout.priceGuaranteeTitle": "No surprise price", "checkout.priceGuaranteeBody": "The accepted amount cannot increase without a written change order.", "checkout.priceGuaranteeMaximum": "Maximum amount",
    "checkout.serviceFee": "Service fee", "checkout.platformCommission": "Platform commission (%{rate})", "checkout.commissionInfo": "The commission is deducted from the service fee and is not charged separately to the customer.", "checkout.totalPayable": "Total to pay", "checkout.paymentMethod": "Payment Method",
    "checkout.walletVerifying": "Verifying balance…", "checkout.walletUnavailable": "Balance unavailable · Payment BLOCKER", "checkout.walletAvailable": "Available: {amount} · Payment BLOCKER", "checkout.walletBlocked": "Payment BLOCKER",
    "checkout.iyzicoSubtitle": "Secure hosted checkout for Türkiye", "checkout.stripeReady": "International card · PaymentSheet", "checkout.stripeBlocked": "Publishable key BLOCKER", "checkout.billingInfo": "Billing Details", "checkout.billingInfoBody": "Card details are never entered into Move&Fix. These details are sent to the server over an encrypted connection to open the iyzico session.",
    "checkout.phonePlaceholder": "Mobile phone (05xx xxx xx xx)", "checkout.identityPlaceholder": "Turkish ID number", "checkout.addressPlaceholder": "Billing address", "checkout.cityPlaceholder": "City", "checkout.zipPlaceholder": "Postal code",
    "checkout.securityNotice": "The amount and commission are calculated only from the accepted server-side offer. Escrow status changes only after a verified webhook.", "checkout.title": "Secure Payment", "checkout.processing": "Preparing secure session…", "checkout.payWith": "Pay {amount} with {provider}",
    "provider.dashboardLoading": "Preparing your dashboard...", "provider.dashboardUnavailable": "Dashboard data could not be loaded", "provider.dashboardUnavailableBody": "Check your provider profile and connection, then try again.", "provider.today": "Today",
    "provider.todayEarnings": "Today’s Earnings", "provider.totalEarnings": "Total earnings: {amount}", "provider.activeJobs": "Active Jobs", "provider.newOffers": "New Offers", "provider.availability": "Availability", "provider.cockpitTitle": "Business Cockpit", "provider.pendingPayments": "Pending payment", "provider.averageRating": "Average rating", "provider.cancellationRate": "Cancellation rate", "provider.metricUnavailable": "No data yet",
    "provider.available": "Available", "provider.unavailable": "Unavailable", "provider.menuNewJobs": "New Jobs", "provider.menuActiveJobs": "Active Jobs", "provider.menuCalendar": "Calendar",
    "provider.menuEarnings": "Earnings", "provider.menuMessages": "Messages", "provider.menuProfile": "Profile",
    "messages.title": "Messages", "messages.subtitle": "Your conversations with providers", "messages.loading": "Loading messages...",
    "messages.errorTitle": "Messages could not be loaded", "messages.errorBody": "Check your connection and try again.", "messages.retry": "Try Again",
    "messages.emptyTitle": "No messages yet", "messages.emptyBody": "Your conversation will appear here when you contact a provider.",
    "tracking.timeline.scheduled": "Scheduled", "tracking.timeline.onTheWay": "On the way", "tracking.timeline.arrived": "Arrived", "tracking.timeline.inProgress": "Started", "tracking.timeline.completed": "Completed",
    "tracking.action.depart": "Start Driving", "tracking.action.arrived": "I Arrived", "tracking.action.start": "Start Job", "tracking.action.complete": "Complete Job",
    "tracking.status.scheduledTitle": "Scheduled", "tracking.status.scheduledSubtitle": "The provider is preparing for your service", "tracking.status.onTheWayTitle": "On the way", "tracking.status.onTheWaySubtitle": "The provider is coming to your location", "tracking.status.etaSubtitle": "Estimated arrival in {minutes} minutes",
    "tracking.status.arrivedTitle": "Arrived at the address", "tracking.status.arrivedSubtitle": "The provider is at the service address", "tracking.status.inProgressTitle": "Service in progress", "tracking.status.inProgressSubtitle": "The provider has started the work", "tracking.status.completedTitle": "Service completed", "tracking.status.completedSubtitle": "You can rate your experience", "tracking.status.cancelledTitle": "Job cancelled", "tracking.status.cancelledSubtitle": "Live tracking has ended for this job",
    "tracking.invalidLinkTitle": "Invalid job link", "tracking.invalidLinkBody": "A valid job number is required for live tracking.", "tracking.back": "Go Back", "tracking.loading": "Loading active job…", "tracking.accessErrorTitle": "Active job could not be opened", "tracking.accessErrorBody": "You do not have access to this job or it is no longer available.", "tracking.retry": "Try Again",
    "tracking.headerTitle": "Active Job", "tracking.minuteShort": "min", "tracking.providerFallback": "Assigned provider", "tracking.serviceFallback": "Service", "tracking.noLocation": "No location shared yet", "tracking.locationUnknown": "Update time is unknown", "tracking.lastUpdated": "Last updated {time}", "tracking.jobsCount": "{count} jobs",
    "tracking.messagingUnavailable": "Messaging unavailable", "tracking.messagingUnavailableBody": "The assigned provider does not have a user record.", "tracking.serviceDetail": "Service Details", "tracking.service": "Service", "tracking.address": "Address", "tracking.addressMissing": "Address not shared", "tracking.jobStatus": "Job Status",
    "tracking.proofTitle": "Work Proof", "tracking.proofHint": "Document the completed work with photos or a video. The customer has 48 hours to respond.", "tracking.aiDisclosure": "Your media may be analysed by MoveAI only to support review. The analysis does not decide approval or payment.", "tracking.proofPlaceholder": "Describe the work completed", "tracking.addProofMedia": "Add Photo or Video", "tracking.submitProof": "Submit Work Proof", "tracking.proofStatus": "Work Proof Status", "tracking.proofDisputed": "A dispute is open. The escrow amount is awaiting an administrator decision.", "tracking.proofExpired": "The customer response period expired; escrow release has been queued.", "tracking.proofRespond": "Review the proof and approve the job or create a dispute.", "tracking.proofRecorded": "Work proof has been recorded.",
    "tracking.aiNote": "MoveAI review note", "tracking.aiConfidence": "Confidence {value}", "tracking.aiDecisionDisclosure": "This automated assessment is decision support only; it does not replace customer approval, a dispute, or an administrator decision.", "tracking.approveJob": "Approve Job", "tracking.createDispute": "Create Dispute", "tracking.disputePlaceholder": "Explain the reason for your dispute", "tracking.submitDispute": "Submit Dispute", "tracking.stopSharing": "Stop Sharing Location", "tracking.shareLocation": "Share Live Location", "tracking.reviewService": "Rate Service"
    ,"jobs.filter.active": "Active", "jobs.filter.offers": "Offers", "jobs.filter.scheduled": "Scheduled", "jobs.filter.completed": "Completed",
    "jobs.status.offers": "Awaiting offers", "jobs.status.scheduled": "Scheduled", "jobs.status.onTheWay": "On the way", "jobs.status.arrived": "Arrived", "jobs.status.inProgress": "Started", "jobs.status.completed": "Completed", "jobs.status.cancelled": "Cancelled",
    "jobs.action.viewOffers": "View Offers", "jobs.action.track": "Track Job", "jobs.action.viewDetail": "View Details", "jobs.serviceFallback": "Service", "jobs.provider": "Provider", "jobs.minuteShort": "min", "jobs.chatAccessibility": "Message {name}",
    "jobs.acceptedOffer": "Accepted Offer", "jobs.budget": "Budget", "jobs.waitingOffer": "Awaiting offers", "jobs.title": "My Jobs", "jobs.subtitle": "Track all your services in one place", "jobs.loading": "Loading your jobs...", "jobs.errorTitle": "Your jobs could not be loaded", "jobs.retry": "Try Again", "jobs.emptyTitle": "No jobs in this section", "jobs.emptyBody": "Services whose status changes will appear here automatically.", "jobs.newRequest": "Create New Request",
    "chat.providerFallback": "Provider", "chat.providerMeta": "Provider · {rating} rating", "chat.userMeta": "Move&Fix user", "chat.invalidContext": "A valid service request is required for this conversation.", "chat.loading": "Loading messages...", "chat.loadError": "Messages could not be loaded", "chat.emptyTitle": "No messages yet", "chat.emptyBody": "Send the first message", "chat.sendError": "Message could not be sent. Please try again.", "chat.voiceSendError": "Voice message could not be sent. Please try again.", "chat.placeholder": "Write a message...", "chat.stopRecordAndSend": "Stop recording and send", "chat.recordVoice": "Record voice message", "chat.translate": "Translate", "chat.showOriginal": "Show original", "chat.showTranslation": "Show translation", "chat.hideForMe": "Hide for me", "chat.translationUnavailable": "Translation is currently unavailable.", "chat.hidden": "The message was hidden from your view.",
    "opportunities.offerSentTitle": "Offer Sent", "opportunities.offerSentBody": "The customer has been notified about your offer.", "opportunities.offerFailedTitle": "Offer Could Not Be Sent", "opportunities.retry": "Please try again.", "opportunities.profileRequiredTitle": "Profile Required", "opportunities.profileRequiredBody": "A professional profile is required to submit an offer.", "opportunities.invalidAmountTitle": "Invalid Amount", "opportunities.invalidAmountBody": "Enter an offer amount greater than zero.", "opportunities.durationRequiredTitle": "Duration Required", "opportunities.durationRequiredBody": "Enter an estimated arrival or completion time.", "opportunities.loading": "Loading job opportunities…", "opportunities.errorTitle": "Opportunities could not be loaded", "opportunities.errorBody": "Check your connection and try again.", "opportunities.title": "New Job Opportunities", "opportunities.emptyTitle": "No new opportunities", "opportunities.emptyBody": "New customer requests matching your categories will appear here.", "opportunities.serviceFallback": "Service request", "opportunities.locationMissing": "Location not specified", "opportunities.customerBudget": "Customer budget", "opportunities.openForOffer": "Open for offers", "opportunities.close": "Close", "opportunities.makeOffer": "Make Offer", "opportunities.pricePlaceholder": "Offer amount (₺)", "opportunities.estimatedTimePlaceholder": "Estimated time, e.g. 30 minutes", "opportunities.messagePlaceholder": "Short note for the customer (optional)", "opportunities.sendOffer": "Send Offer",
    "security.revokeFailed": "Session Could Not Be Revoked", "security.sessionsRevokeFailed": "Sessions Could Not Be Revoked", "security.sessionsRevoked": "Sessions Closed", "security.sessionsRevokedBody": "{count} other sessions were safely revoked.", "security.revokeCurrentTitle": "Sign Out From This Device", "security.revokeDeviceTitle": "Close Device Session", "security.revokeCurrentBody": "Your session on this device will be closed.", "security.revokeDeviceBody": "This device will no longer be able to access your account.", "security.cancel": "Cancel", "security.revoke": "Close Session", "security.revokeOthersTitle": "Close All Other Sessions", "security.revokeOthersBody": "All active sessions except this device will be closed.", "security.revokeOthers": "Close Others", "security.back": "Go back", "security.title": "Account Security", "security.noticeTitle": "Secure sessions", "security.noticeBody": "Close unrecognized devices immediately. Withdrawals require password re-authentication.", "security.activeDevices": "Active devices", "security.loadFailed": "Sessions could not be loaded", "security.retry": "Try again", "security.currentDevice": "This device", "security.signedInDevice": "Signed-in device", "security.active": "Active", "security.deviceMissing": "Device information unavailable", "security.closed": "Session closed", "security.lastActivity": "Last activity: {date}", "security.signOut": "Sign out", "security.close": "Close", "security.noSessions": "No local sessions found", "security.noSessionsBody": "OAuth sessions are managed by the identity provider."
  },
  ru: {
    "consent.title": "Юридические согласия",
    "consent.requiredHint": "Чтобы продолжить, необходимо подтвердить все обязательные пункты ниже.",
    "consent.readText": "Прочитать текст →",
    "consent.createAccount": "Создать аккаунт",
    "consent.acceptAll": "Подтвердите все обязательные пункты",
    "privacy.title": "Политика конфиденциальности Move&Fix",
    "privacy.updated": "Последнее обновление",
    "privacy.publicDescription": "Политика конфиденциальности Move&Fix и сведения об обработке персональных данных.",
    "privacy.publicNotice": "Эта страница доступна публично без входа в аккаунт.",
    "privacy.approvedText": "Утверждённый текст",
    "privacy.pendingLegalReviewTitle": "Ожидается юридическая проверка",
    "privacy.pendingLegalReviewBody": "Английский перевод предоставлен для доступности. До завершения юридической проверки утверждённой и основной остаётся турецкая политика.",
    "privacy.tabAccessibility": "Политика конфиденциальности: {language}",
    "privacy.tabHint": "Изменяет язык отображения политики конфиденциальности",
    currencyUsd: "$ USD",
    currencyEur: "€ EUR",
    currencyUnavailableTitle: "Конвертация валюты не настроена",
    currencyUnavailableBody: "Для отображения или оплаты в {currency} не настроен одобренный поставщик курсов. Все суммы безопасно остаются в TRY.",
    currencySettlementNotice: "Платежи и баланс кошелька рассчитываются только в TRY.",
    "ai.welcome": "Здравствуйте! Я MoveAI 🤖 Чем могу помочь? У вас срочная проблема или вы ищете услугу?",
    "ai.online": "В сети", "ai.thinking": "MoveAI думает...", "ai.inputPlaceholder": "Напишите ваш вопрос...",
    "ai.fallback": "Я стараюсь помочь. Пожалуйста, опишите ситуацию немного подробнее.",
    "ai.requestCreatedTitle": "Заявка на услугу создана", "ai.requestCreatedBody": "MoveAI создал вашу заявку. Хотите посмотреть подходящих мастеров?",
    "ai.later": "Позже", "ai.viewProviders": "Смотреть мастеров", "ai.prompt.plumbing": "У меня дома течёт вода",
    "ai.prompt.roadside": "Машина сломалась в дороге", "ai.prompt.airConditioning": "Кондиционер не охлаждает", "ai.prompt.towTruck": "Нужен эвакуатор",
    "ai.prompt.courier": "Нужен курьер", "ai.prompt.priceEstimate": "Узнать примерную цену",
    "wallet.loading": "Загрузка MoveWallet…", "wallet.loadFailedTitle": "Не удалось получить данные кошелька", "wallet.loadFailedBody": "Проверьте защищённое подключение и повторите попытку.",
    "wallet.retry": "Повторить", "wallet.retryAccessibility": "Повторно загрузить данные кошелька", "wallet.historyAccessibility": "Открыть историю операций MoveWallet",
    "wallet.balance": "Баланс", "wallet.pendingEscrow": "В эскроу ожидает {amount}", "wallet.addMoney": "Пополнить", "wallet.withdraw": "Вывести",
    "wallet.history": "История операций", "wallet.recentTransactions": "Последние операции", "wallet.allTransactionsAccessibility": "Показать все операции кошелька",
    "wallet.emptyTitle": "Операций в кошельке пока нет", "wallet.emptyBody": "Здесь появятся записи об оплатах, возвратах и выводе средств.",
    "profile.defaultName": "Пользователь Move&Fix", "profile.defaultMember": "Участник Move&Fix", "profile.reviewCount": "Отзывов: {count}",
    "profile.personalInfo": "Личные данные", "profile.addresses": "Мои адреса", "profile.paymentMethods": "Способы оплаты",
    "profile.favorites": "Избранное", "profile.pastJobs": "Прошлые заказы", "profile.settingsSecurity": "Настройки и безопасность",
    "checkout.invalidLink": "Недействительная ссылка на оплату", "checkout.invalidLinkBody": "Номер заказа отсутствует или неверен.", "checkout.loadingQuote": "Готовим защищённую сводку оплаты…", "checkout.quoteUnavailable": "Не удалось получить сводку оплаты",
    "checkout.serviceSummary": "Сводка услуги", "checkout.provider": "Мастер: {name}", "checkout.total": "Итого", "checkout.escrowGuarantee": "Защита эскроу Move&Fix", "checkout.feeBreakdown": "Расчёт стоимости", "checkout.priceGuaranteeTitle": "Без неожиданных цен", "checkout.priceGuaranteeBody": "Согласованная сумма не может быть увеличена без письменного изменения заказа.", "checkout.priceGuaranteeMaximum": "Максимальная сумма",
    "checkout.serviceFee": "Стоимость услуги", "checkout.platformCommission": "Комиссия платформы (%{rate})", "checkout.commissionInfo": "Комиссия удерживается из стоимости услуги и не взимается с клиента отдельно.", "checkout.totalPayable": "К оплате", "checkout.paymentMethod": "Способ оплаты",
    "checkout.walletVerifying": "Проверяем баланс…", "checkout.walletUnavailable": "Баланс недоступен · BLOCKER оплаты", "checkout.walletAvailable": "Доступно: {amount} · BLOCKER оплаты", "checkout.walletBlocked": "BLOCKER оплаты",
    "checkout.iyzicoSubtitle": "Безопасная платёжная страница для Турции", "checkout.stripeReady": "Международная карта · PaymentSheet", "checkout.stripeBlocked": "BLOCKER publishable key", "checkout.billingInfo": "Платёжные данные", "checkout.billingInfoBody": "Данные карты не вводятся в Move&Fix. Эти данные передаются на сервер по защищённому соединению для открытия сессии iyzico.",
    "checkout.phonePlaceholder": "Мобильный телефон (05xx xxx xx xx)", "checkout.identityPlaceholder": "Турецкий идентификационный номер", "checkout.addressPlaceholder": "Платёжный адрес", "checkout.cityPlaceholder": "Город", "checkout.zipPlaceholder": "Почтовый индекс",
    "checkout.securityNotice": "Сумма и комиссия рассчитываются только по принятому предложению на сервере. Статус эскроу меняется только после подтверждённого webhook.", "checkout.title": "Защищённая оплата", "checkout.processing": "Подготавливаем защищённую сессию…", "checkout.payWith": "Оплатить {amount} через {provider}",
    "provider.dashboardLoading": "Готовим панель...", "provider.dashboardUnavailable": "Не удалось загрузить данные панели", "provider.dashboardUnavailableBody": "Проверьте профиль мастера и подключение, затем повторите попытку.", "provider.today": "Сегодня",
    "provider.todayEarnings": "Заработок за сегодня", "provider.totalEarnings": "Общий заработок: {amount}", "provider.activeJobs": "Активные заказы", "provider.newOffers": "Новые предложения", "provider.availability": "Доступность", "provider.cockpitTitle": "Рабочая панель", "provider.pendingPayments": "Ожидающий платёж", "provider.averageRating": "Средняя оценка", "provider.cancellationRate": "Доля отмен", "provider.metricUnavailable": "Данных пока нет",
    "provider.available": "Доступен", "provider.unavailable": "Недоступен", "provider.menuNewJobs": "Новые заказы", "provider.menuActiveJobs": "Активные заказы", "provider.menuCalendar": "Календарь",
    "provider.menuEarnings": "Заработок", "provider.menuMessages": "Сообщения", "provider.menuProfile": "Профиль",
    "messages.title": "Сообщения", "messages.subtitle": "Ваши диалоги с мастерами", "messages.loading": "Загружаем сообщения...",
    "messages.errorTitle": "Не удалось загрузить сообщения", "messages.errorBody": "Проверьте подключение и повторите попытку.", "messages.retry": "Повторить",
    "messages.emptyTitle": "Сообщений пока нет", "messages.emptyBody": "Диалог появится здесь, когда вы свяжетесь с мастером.",
    "tracking.timeline.scheduled": "Запланировано", "tracking.timeline.onTheWay": "В пути", "tracking.timeline.arrived": "Прибыл", "tracking.timeline.inProgress": "Работа начата", "tracking.timeline.completed": "Завершено",
    "tracking.action.depart": "Выехать", "tracking.action.arrived": "Я приехал", "tracking.action.start": "Начать работу", "tracking.action.complete": "Завершить работу",
    "tracking.status.scheduledTitle": "Запланировано", "tracking.status.scheduledSubtitle": "Мастер готовится к услуге", "tracking.status.onTheWayTitle": "В пути", "tracking.status.onTheWaySubtitle": "Мастер едет к вам", "tracking.status.etaSubtitle": "Ожидаемое прибытие через {minutes} мин.",
    "tracking.status.arrivedTitle": "Прибыл по адресу", "tracking.status.arrivedSubtitle": "Мастер находится по адресу услуги", "tracking.status.inProgressTitle": "Услуга выполняется", "tracking.status.inProgressSubtitle": "Мастер начал работу", "tracking.status.completedTitle": "Услуга завершена", "tracking.status.completedSubtitle": "Вы можете оценить услугу", "tracking.status.cancelledTitle": "Заказ отменён", "tracking.status.cancelledSubtitle": "Отслеживание этого заказа завершено",
    "tracking.invalidLinkTitle": "Недействительная ссылка на заказ", "tracking.invalidLinkBody": "Для отслеживания нужен действительный номер заказа.", "tracking.back": "Назад", "tracking.loading": "Загружаем активный заказ…", "tracking.accessErrorTitle": "Не удалось открыть активный заказ", "tracking.accessErrorBody": "У вас нет доступа к заказу или он больше не доступен.", "tracking.retry": "Повторить",
    "tracking.headerTitle": "Активный заказ", "tracking.minuteShort": "мин", "tracking.providerFallback": "Назначенный мастер", "tracking.serviceFallback": "Услуга", "tracking.noLocation": "Геолокация ещё не передана", "tracking.locationUnknown": "Время обновления неизвестно", "tracking.lastUpdated": "Обновлено {time}", "tracking.jobsCount": "Заказов: {count}",
    "tracking.messagingUnavailable": "Сообщения недоступны", "tracking.messagingUnavailableBody": "У назначенного мастера нет записи пользователя.", "tracking.serviceDetail": "Детали услуги", "tracking.service": "Услуга", "tracking.address": "Адрес", "tracking.addressMissing": "Адрес не указан", "tracking.jobStatus": "Статус заказа",
    "tracking.proofTitle": "Подтверждение работы", "tracking.proofHint": "Подтвердите завершённую работу фотографиями или видео. У клиента есть 48 часов на ответ.", "tracking.aiDisclosure": "Ваши материалы могут быть проанализированы MoveAI только для поддержки проверки. Анализ не принимает решение об одобрении или оплате.", "tracking.proofPlaceholder": "Опишите выполненную работу", "tracking.addProofMedia": "Добавить фото или видео", "tracking.submitProof": "Отправить подтверждение", "tracking.proofStatus": "Статус подтверждения", "tracking.proofDisputed": "Открыт спор. Сумма эскроу ожидает решения администратора.", "tracking.proofExpired": "Срок ответа клиента истёк; освобождение эскроу поставлено в очередь.", "tracking.proofRespond": "Проверьте подтверждение и одобрите заказ или создайте спор.", "tracking.proofRecorded": "Подтверждение работы сохранено.",
    "tracking.aiNote": "Заметка проверки MoveAI", "tracking.aiConfidence": "Уверенность {value}", "tracking.aiDecisionDisclosure": "Эта автоматическая оценка служит только поддержкой решения и не заменяет одобрение клиента, спор или решение администратора.", "tracking.approveJob": "Одобрить заказ", "tracking.createDispute": "Открыть спор", "tracking.disputePlaceholder": "Опишите причину спора", "tracking.submitDispute": "Отправить спор", "tracking.stopSharing": "Остановить передачу геолокации", "tracking.shareLocation": "Передавать геолокацию", "tracking.reviewService": "Оценить услугу"
    ,"jobs.filter.active": "Активные", "jobs.filter.offers": "Предложения", "jobs.filter.scheduled": "Запланированные", "jobs.filter.completed": "Завершённые",
    "jobs.status.offers": "Ожидаются предложения", "jobs.status.scheduled": "Запланировано", "jobs.status.onTheWay": "В пути", "jobs.status.arrived": "Прибыл", "jobs.status.inProgress": "Работа начата", "jobs.status.completed": "Завершено", "jobs.status.cancelled": "Отменено",
    "jobs.action.viewOffers": "Посмотреть предложения", "jobs.action.track": "Отследить заказ", "jobs.action.viewDetail": "Открыть детали", "jobs.serviceFallback": "Услуга", "jobs.provider": "Мастер", "jobs.minuteShort": "мин", "jobs.chatAccessibility": "Написать {name}",
    "jobs.acceptedOffer": "Принятое предложение", "jobs.budget": "Бюджет", "jobs.waitingOffer": "Ожидаются предложения", "jobs.title": "Мои заказы", "jobs.subtitle": "Все услуги в одном месте", "jobs.loading": "Загружаем ваши заказы...", "jobs.errorTitle": "Не удалось загрузить заказы", "jobs.retry": "Повторить", "jobs.emptyTitle": "В этом разделе нет заказов", "jobs.emptyBody": "Услуги с изменившимся статусом появятся здесь автоматически.", "jobs.newRequest": "Создать новый запрос",
    "chat.providerFallback": "Мастер", "chat.providerMeta": "Мастер · оценка {rating}", "chat.userMeta": "Пользователь Move&Fix", "chat.invalidContext": "Для этого чата нужен действительный запрос на услугу.", "chat.loading": "Загружаем сообщения...", "chat.loadError": "Не удалось загрузить сообщения", "chat.emptyTitle": "Сообщений пока нет", "chat.emptyBody": "Отправьте первое сообщение", "chat.sendError": "Не удалось отправить сообщение. Повторите попытку.", "chat.voiceSendError": "Не удалось отправить голосовое сообщение. Повторите попытку.", "chat.placeholder": "Напишите сообщение...", "chat.stopRecordAndSend": "Остановить запись и отправить", "chat.recordVoice": "Записать голосовое сообщение", "chat.translate": "Перевести", "chat.showOriginal": "Показать оригинал", "chat.showTranslation": "Показать перевод", "chat.hideForMe": "Скрыть для меня", "chat.translationUnavailable": "Перевод сейчас недоступен.", "chat.hidden": "Сообщение скрыто из вашего представления.",
    "opportunities.offerSentTitle": "Предложение отправлено", "opportunities.offerSentBody": "Клиент получил уведомление о вашем предложении.", "opportunities.offerFailedTitle": "Не удалось отправить предложение", "opportunities.retry": "Повторите попытку.", "opportunities.profileRequiredTitle": "Нужен профиль", "opportunities.profileRequiredBody": "Чтобы отправить предложение, нужен профиль мастера.", "opportunities.invalidAmountTitle": "Некорректная сумма", "opportunities.invalidAmountBody": "Введите сумму предложения больше нуля.", "opportunities.durationRequiredTitle": "Укажите срок", "opportunities.durationRequiredBody": "Укажите предполагаемое время прибытия или завершения.", "opportunities.loading": "Загружаем новые заказы…", "opportunities.errorTitle": "Не удалось загрузить предложения", "opportunities.errorBody": "Проверьте соединение и повторите попытку.", "opportunities.title": "Новые заказы", "opportunities.emptyTitle": "Новых предложений нет", "opportunities.emptyBody": "Здесь появятся новые запросы клиентов из ваших категорий.", "opportunities.serviceFallback": "Запрос на услугу", "opportunities.locationMissing": "Адрес не указан", "opportunities.customerBudget": "Бюджет клиента", "opportunities.openForOffer": "Открыто для предложений", "opportunities.close": "Закрыть", "opportunities.makeOffer": "Сделать предложение", "opportunities.pricePlaceholder": "Сумма предложения (₺)", "opportunities.estimatedTimePlaceholder": "Примерный срок, например 30 минут", "opportunities.messagePlaceholder": "Короткая заметка клиенту (необязательно)", "opportunities.sendOffer": "Отправить предложение",
    "security.revokeFailed": "Не удалось закрыть сеанс", "security.sessionsRevokeFailed": "Не удалось закрыть сеансы", "security.sessionsRevoked": "Сеансы закрыты", "security.sessionsRevokedBody": "Других сеансов закрыто: {count}.", "security.revokeCurrentTitle": "Выйти на этом устройстве", "security.revokeDeviceTitle": "Закрыть сеанс устройства", "security.revokeCurrentBody": "Сеанс на этом устройстве будет закрыт.", "security.revokeDeviceBody": "Устройство больше не сможет войти в ваш аккаунт.", "security.cancel": "Отмена", "security.revoke": "Закрыть сеанс", "security.revokeOthersTitle": "Закрыть все другие сеансы", "security.revokeOthersBody": "Все активные сеансы, кроме этого устройства, будут закрыты.", "security.revokeOthers": "Закрыть остальные", "security.back": "Назад", "security.title": "Безопасность аккаунта", "security.noticeTitle": "Защищённые сеансы", "security.noticeBody": "Сразу закрывайте незнакомые устройства. Для вывода средств нужно повторно подтвердить пароль.", "security.activeDevices": "Активные устройства", "security.loadFailed": "Не удалось загрузить сеансы", "security.retry": "Повторить", "security.currentDevice": "Это устройство", "security.signedInDevice": "Устройство с входом", "security.active": "Активно", "security.deviceMissing": "Нет сведений об устройстве", "security.closed": "Сеанс закрыт", "security.lastActivity": "Последняя активность: {date}", "security.signOut": "Выйти", "security.close": "Закрыть", "security.noSessions": "Локальных сеансов нет", "security.noSessionsBody": "OAuth-сеансами управляет поставщик идентификации."
  },
};

let currentLanguage: Language = "tr";

export function setLanguage(lang: Language) { currentLanguage = lang; }
export function getLanguage(): Language { return currentLanguage; }
export function t(key: TranslationKey, language?: Language, values?: TranslationValues): string;
export function t(key: TranslationKey, values?: TranslationValues): string;
export function t(key: TranslationKey, languageOrValues: Language | TranslationValues = currentLanguage, maybeValues?: TranslationValues): string {
  const language = typeof languageOrValues === "string" ? languageOrValues : currentLanguage;
  const values = typeof languageOrValues === "string" ? (maybeValues ?? {}) : languageOrValues;
  const requestFallback = key.startsWith("request.")
    ? (language === "tr"
      ? requestTurkishTranslations[key as `request.${string}`] ?? requestFallbackTranslations[key as `request.${string}`]
      : requestFallbackTranslations[key as `request.${string}`])
    : undefined;
  const expenseFallback = key.startsWith("expense.")
    ? (language === "tr"
      ? expenseTurkishTranslations[key as `expense.${string}`] ?? expenseFallbackTranslations[key as `expense.${string}`]
      : expenseFallbackTranslations[key as `expense.${string}`])
    : undefined;
  const verificationFallback = key.startsWith("verification.")
    ? (language === "tr"
      ? verificationTurkishTranslations[key as `verification.${string}`] ?? verificationFallbackTranslations[key as `verification.${string}`]
      : verificationFallbackTranslations[key as `verification.${string}`])
    : undefined;
  const privacyCenterFallback = key.startsWith("privacy.center.")
    ? (language === "tr"
      ? privacyCenterTurkishTranslations[key as `privacy.center.${string}`] ?? privacyCenterFallbackTranslations[key as `privacy.center.${string}`]
      : privacyCenterFallbackTranslations[key as `privacy.center.${string}`])
    : undefined;
  const providerOnboardingFallback = key in providerOnboardingFallbackTranslations
    ? (language === "tr"
      ? providerOnboardingTurkishTranslations[key as ProviderOnboardingTranslationKey]
      : providerOnboardingFallbackTranslations[key as ProviderOnboardingTranslationKey])
    : undefined;
  const profileEditFallback = key in profileEditFallbackTranslations
    ? (language === "tr"
      ? profileEditTurkishTranslations[key as ProfileEditTranslationKey]
      : profileEditFallbackTranslations[key as ProfileEditTranslationKey])
    : undefined;
  const chatPreferenceFallback = key in chatPreferenceFallbackTranslations
    ? (language === "tr"
      ? chatPreferenceTurkishTranslations[key as `chat.${string}`] ?? chatPreferenceFallbackTranslations[key as `chat.${string}`]
      : chatPreferenceFallbackTranslations[key as `chat.${string}`])
    : undefined;
  const p17ClosureFallback = key in p17ClosureFallbackTranslations
    ? (language === "tr"
      ? p17ClosureTurkishTranslations[key as P17ClosureTranslationKey]
      : p17ClosureFallbackTranslations[key as P17ClosureTranslationKey])
    : undefined;
  const template = extraTranslations[language]?.[key] ?? translations[language]?.[key] ?? requestFallback ?? expenseFallback ?? verificationFallback ?? privacyCenterFallback ?? providerOnboardingFallback ?? profileEditFallback ?? chatPreferenceFallback ?? p17ClosureFallback ?? extraTranslations.tr?.[key] ?? translations.tr?.[key] ?? key;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
export function localeForLanguage(language: Language) { return LANGUAGES.find((item) => item.code === language)?.locale ?? "tr-TR"; }
export function isRightToLeft(language: Language) { return LANGUAGES.find((item) => item.code === language)?.isRTL ?? false; }
export function languageFromDeviceLocale(localeTag: string | null | undefined): Language {
  const normalized = localeTag?.trim().replace("_", "-").toLowerCase();
  if (!normalized) return "tr";
  const exact = LANGUAGES.find((item) => item.locale.toLowerCase() === normalized);
  if (exact) return exact.code;
  const languageCode = normalized.split("-")[0] as Language;
  return LANGUAGES.some((item) => item.code === languageCode) ? languageCode : "tr";
}
export function formatMoney(amount: number, language: Language = currentLanguage) { return new Intl.NumberFormat(localeForLanguage(language), { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(amount); }
export function formatLocalDate(value: Date | string | number, language: Language = currentLanguage) { return new Intl.DateTimeFormat(localeForLanguage(language), { dateStyle: "medium" }).format(new Date(value)); }
