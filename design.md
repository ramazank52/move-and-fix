# Move&Fix - Mobile App Interface Design

## Design Philosophy
- **Mobile portrait orientation (9:16)**, one-handed usage optimized
- Apple Human Interface Guidelines (HIG) compliant
- Clean, modern, fast, accessible
- iOS-native feel with consistent design language

---

## Color Palette

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| primary | #FF6B00 | #FF8533 | Brand orange - CTAs, highlights |
| background | #FFFFFF | #1A1A1A | Screen backgrounds |
| surface | #F8F9FA | #2D2D2D | Cards, elevated surfaces |
| foreground | #1A1A1A | #F5F5F5 | Primary text |
| muted | #6B7280 | #9CA3AF | Secondary text |
| border | #E5E7EB | #374151 | Dividers, borders |
| success | #10B981 | #34D399 | Completed states |
| warning | #F59E0B | #FBBF24 | Pending states |
| error | #EF4444 | #F87171 | Error states |
| accent | #3B82F6 | #60A5FA | Links, info |

---

## Screen List

### Onboarding & Auth
1. **Splash Screen** - App logo animation
2. **Onboarding** - 3-step feature introduction slides
3. **Login** - Email/phone + password
4. **Register** - Role selection (Customer/Provider) + form
5. **Forgot Password** - Email reset flow
6. **OTP Verification** - Phone/email code entry

### Main Tabs (Customer)
1. **Home** - Search bar, categories, nearby providers, campaigns, top-rated
2. **Search/Explore** - Map view + list view toggle, filters
3. **My Jobs** - Active, pending, completed, cancelled jobs
4. **Messages** - Chat list with providers
5. **Profile** - User info, addresses, favorites, settings

### Main Tabs (Provider)
1. **Dashboard** - Earnings, active jobs, stats, MoveScore
2. **Jobs** - Available jobs, my offers, active work
3. **Calendar** - Availability management
4. **Messages** - Chat list with customers
5. **Profile** - Professional profile, documents, settings

### Service Flow Screens
1. **Category List** - All service categories grid
2. **Service Detail** - Category info + providers list
3. **Create Service Request** - Multi-step form (category, description, photos, location, date, budget)
4. **Provider Profile** - Full profile view with gallery, reviews, badges
5. **Offers List** - Compare received offers
6. **Offer Detail** - Price, duration, provider info
7. **Job Tracking** - Live status, provider location on map
8. **Review & Rate** - Star rating + written review

### Payment Screens
1. **Payment Methods** - Saved cards, add new
2. **Checkout** - Escrow payment confirmation
3. **Payment History** - Transaction list
4. **Invoice Detail** - Individual invoice view

### Messaging
1. **Chat List** - All conversations
2. **Chat Room** - Messages, photos, location sharing
3. **AI Assistant Chat** - MoveAI conversation

### Settings & More
1. **Settings** - Language, notifications, theme, privacy
2. **Addresses** - Saved locations management
3. **Favorites** - Favorite providers list
4. **Notifications** - All notifications feed
5. **Help & Support** - FAQ, contact, dispute
6. **Premium** - Subscription plans
7. **About** - App info, terms, privacy policy

### Admin Screens (in-app)
1. **Admin Dashboard** - KPIs, revenue, users stats
2. **User Management** - List/search/ban users
3. **Category Management** - Add/edit/remove categories
4. **Commission Settings** - Rate management
5. **Reports** - Analytics and reports
6. **AI Settings** - AI configuration

---

## Primary Content and Functionality

### Home Screen
- Search bar (top, sticky)
- Horizontal scrolling category icons (8-12 visible)
- "Nearby Providers" section with cards (photo, name, rating, distance)
- "Top Rated" horizontal scroll
- Active campaigns banner carousel
- Recent services section

### Service Request Creation
- Step 1: Select category (grid with icons)
- Step 2: Describe problem (text + photo/video upload)
- Step 3: Set location (map picker or saved address)
- Step 4: Choose date/time (calendar + time slots)
- Step 5: Set budget or request offers
- Step 6: Review & submit

### Provider Dashboard
- Earnings card (today/week/month)
- MoveScore gauge
- Active jobs count
- New job requests notification badge
- Quick actions (go online/offline, view calendar)
- Performance chart (last 7 days)

---

## Key User Flows

### Customer: Request Service
Home → Select Category → Create Request → Wait for Offers → Compare Offers → Accept Offer → Track Provider → Confirm Completion → Rate & Review → Payment Released

### Provider: Complete a Job
Dashboard → View New Job → Send Offer → Offer Accepted → Navigate to Location → Start Job → Mark Complete → Receive Payment

### Messaging Flow
Job Detail → Open Chat → Send Message/Photo/Location → Receive Reply → Continue conversation

### Payment (Escrow) Flow
Accept Offer → Pay to Escrow → Service In Progress → Confirm Completion → Commission Deducted → Provider Paid

### AI Assistant Flow
Any Screen → Tap AI Button → Describe Need → AI Suggests Category → Auto-fill Service Request → User Confirms

---

## Navigation Structure

```
Root
├── (auth)
│   ├── onboarding
│   ├── login
│   ├── register
│   └── forgot-password
├── (customer-tabs)
│   ├── home
│   ├── explore
│   ├── my-jobs
│   ├── messages
│   └── profile
├── (provider-tabs)
│   ├── dashboard
│   ├── jobs
│   ├── calendar
│   ├── messages
│   └── profile
└── (modals)
    ├── create-service
    ├── provider-detail
    ├── chat-room
    ├── ai-assistant
    ├── payment
    ├── notifications
    └── settings
```

---

## Typography

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| H1 | 28px | Bold | Screen titles |
| H2 | 22px | Semibold | Section headers |
| H3 | 18px | Semibold | Card titles |
| Body | 16px | Regular | Main content |
| Caption | 14px | Regular | Secondary info |
| Small | 12px | Regular | Badges, timestamps |

---

## Component Library

- **ServiceCard** - Provider photo, name, rating, price range, distance
- **CategoryChip** - Icon + label, horizontal scroll
- **OfferCard** - Provider info, price, duration, accept/reject buttons
- **ChatBubble** - Text/image message with timestamp
- **RatingStars** - 1-5 interactive star rating
- **StatusBadge** - Job status indicator (pending/active/completed)
- **PriceTag** - Formatted price with currency
- **MapMarker** - Custom provider/job location marker
- **AIBubble** - AI assistant message with typing animation
