# End-to-End Test Checklist

## Test Environment
- **API**: https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net
- **App**: Expo Go on iOS/Android or `npx expo start --web`
- **Auth**: SAIT Microsoft Entra ID (Azure AD)

---

## Flow 1: Registration & Onboarding
- [ ] Open app → Welcome screen appears
- [ ] Tap "Sign in with SAIT" → Microsoft login page loads
- [ ] Sign in with `@edu.sait.ca` email → Redirected to onboarding
- [ ] Complete tutorial slides → Profile setup screen
- [ ] Fill in program, skills, weaknesses → "Get Started" button
- [ ] Home screen loads with listings

## Flow 2: Browse & Search
- [ ] Home screen shows hero banner + category pills + listings
- [ ] Tap a category → Filtered listings appear
- [ ] Search tab → Type keyword → Results update in real-time
- [ ] Tap a listing card → Listing detail screen
- [ ] Pull-to-refresh → Listings reload

## Flow 3: Create Listing
- [ ] Tap "+" tab → Create Listing form
- [ ] Select OFFER/REQUEST toggle
- [ ] Enter title, description, credits
- [ ] Optional: Add photo from camera/gallery
- [ ] Submit → "Listing created" success → Appears in feed

## Flow 4: Chat & Messaging
- [ ] From listing detail → Tap "Chat" button
- [ ] Chat screen opens with the listing owner
- [ ] Send a message → Appears in real-time
- [ ] Other user replies → Message appears instantly (socket.io)
- [ ] Typing indicator shows when other user is typing
- [ ] Go to Chats tab → All conversations listed

## Flow 5: QR Exchange
- [ ] From chat → Agree on exchange
- [ ] Navigate to Exchange screen
- [ ] Generate exchange code → Code displayed (CB-XXXXXXXX)
- [ ] Other user enters code → Both tap "Confirm"
- [ ] Credits automatically transfer
- [ ] Success screen shows "Exchange Complete!"

## Flow 6: Reviews
- [ ] View another user's profile
- [ ] Tap "Leave Review" → Star rating modal
- [ ] Select 1-5 stars, write comment → Submit
- [ ] Review appears on their profile
- [ ] Average rating updates

## Flow 7: Notifications
- [ ] Create listing → Smart matching sends notification to matching users
- [ ] Notification bell shows unread count
- [ ] Tap notification → Navigate to related listing/chat
- [ ] "Mark all read" clears badge

## Flow 8: Leaderboard & Insights
- [ ] Home screen → Tap 🏆 Leaderboard
- [ ] Shows weekly top helpers with animated podium
- [ ] Home screen → Tap 📊 Insights
- [ ] Shows trending listings, category chart, stats

## Flow 9: Credits
- [ ] Go to Profile → Time Credits
- [ ] Balance displayed with hero card
- [ ] Transaction history loads
- [ ] After exchange, new transaction appears

## Flow 10: Admin Functions
- [ ] Log in as Admin role user
- [ ] Profile → Admin Dashboard
- [ ] Listings tab → Can delete any listing
- [ ] Users tab → Shows all users with roles
- [ ] Audit log tab → Shows recent API calls

## Flow 11: Security Verification
- [ ] API returns proper security headers (check with curl)
- [ ] Expired/invalid token → 401 response
- [ ] Non-admin accessing admin route → 403
- [ ] SQL injection attempt in search → No error, parameterized query blocks it
- [ ] Rate limiting: 101 requests in 15min → 429 response

---

## Status
| Flow | Pass/Fail | Notes |
|------|-----------|-------|
| 1. Registration | | |
| 2. Browse | | |
| 3. Create Listing | | |
| 4. Chat | | |
| 5. QR Exchange | | |
| 6. Reviews | | |
| 7. Notifications | | |
| 8. Leaderboard | | |
| 9. Credits | | |
| 10. Admin | | |
| 11. Security | | |
