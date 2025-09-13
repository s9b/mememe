# 🧪 Staging Test Plan - Token & Stripe Flows

This document outlines comprehensive testing scenarios for token deduction and Stripe payment flows in the staging environment.

## 🎯 **Pre-Test Setup**

### **Environment Requirements**
- **Staging URL**: `https://mememe-staging.vercel.app` (or your staging domain)
- **Test Stripe Keys**: Use Stripe test mode keys in staging environment
- **Test Firebase**: Separate Firebase project for staging
- **Test Email**: Use test email accounts for user registration

### **Test Data Preparation**
```bash
# Test user accounts to create:
test-user-1@example.com (password: TestUser123!)
test-user-2@example.com (password: TestUser123!)
stripe-test@example.com (password: StripeTest123!)
```

### **Stripe Test Cards**
```
✅ Success Card: 4242 4242 4242 4242
❌ Decline Card: 4000 0000 0000 0002
⚠️  Requires Auth: 4000 0025 0000 3155
💳 International: 4000 0000 0000 4954
```

---

## 🧪 **Test Scenarios**

### **T1: User Registration & Initial Tokens**

**Objective**: Verify new users receive welcome tokens

**Steps**:
1. Navigate to staging site
2. Click "Sign Up" 
3. Register with new email: `newuser-${Date.now()}@test.com`
4. Complete email verification (if enabled)
5. Check user dashboard

**Expected Results**:
- ✅ User account created in Firebase
- ✅ User document created in Firestore
- ✅ Initial token balance: 3 tokens (or configured amount)
- ✅ Token display in navbar shows correct count
- ✅ User can see token info on billing page

**Test Data to Verify**:
```javascript
// Firestore user document structure
{
  uid: "user-id",
  email: "newuser@test.com",
  displayName: "User Name",
  tokensRemaining: 3,
  tokensPurchased: 0,
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

---

### **T2: Token Consumption - Meme Generation**

**Objective**: Verify tokens are correctly deducted on meme generation

**Prerequisites**: User with 3+ tokens

**Steps**:
1. Login with test user
2. Note initial token count in navbar
3. Enter topic: "funny cats"
4. Select language: English
5. Click "Generate Memes"
6. Wait for meme generation to complete
7. Check token count in navbar
8. Verify token transaction in Firestore

**Expected Results**:
- ✅ Token count decreases by 1
- ✅ Memes generated successfully  
- ✅ Token transaction logged in `tokenTransactions` collection
- ✅ User document `tokensRemaining` updated
- ✅ UI updates reflect new token balance

**Firestore Transaction Record**:
```javascript
// tokenTransactions collection
{
  userId: "user-id",
  type: "consumption",
  amount: -1,
  reason: "meme_generation", 
  metadata: {
    memeId: "meme_timestamp_random",
    topic: "funny cats",
    templatesGenerated: 1
  },
  timestamp: "timestamp"
}
```

---

### **T3: Token Consumption - Regeneration**

**Objective**: Verify regeneration also consumes tokens

**Prerequisites**: User with 2+ tokens and previously generated memes

**Steps**:
1. Login with test user who has generated memes
2. Note token count
3. Click "Try Different Template" button
4. Wait for regeneration
5. Verify token deduction

**Expected Results**:
- ✅ Token count decreases by 1
- ✅ New meme template used
- ✅ Regeneration transaction logged
- ✅ UI updates correctly

---

### **T4: Insufficient Tokens - Generation Blocked**

**Objective**: Verify users with 0 tokens cannot generate memes

**Prerequisites**: User with 0 tokens

**Steps**:
1. Login with test user (ensure 0 tokens)
2. Try to generate memes
3. Observe UI behavior

**Expected Results**:
- ✅ Generate button shows "Buy Tokens to Generate"
- ✅ Generate button is disabled
- ✅ Token warning message displayed
- ✅ "Buy tokens now" link present
- ✅ No API calls made to generation endpoint

---

### **T5: Stripe Checkout - Successful Purchase**

**Objective**: Test successful token purchase flow

**Prerequisites**: User with 0-2 tokens

**Steps**:
1. Login to staging
2. Navigate to billing page OR click "Buy Tokens"
3. Select token package (e.g., 10 tokens for $1.99)
4. Click "Purchase" 
5. Redirected to Stripe Checkout
6. Fill in test card: `4242424242424242`
7. Enter expiry: `12/34`, CVC: `123`
8. Enter test billing info
9. Complete purchase
10. Redirected back to app

**Expected Results**:
- ✅ Stripe checkout session created
- ✅ Payment processed successfully
- ✅ Webhook received and processed
- ✅ User tokens updated in Firestore
- ✅ Purchase transaction logged
- ✅ User redirected to success page
- ✅ Updated token count displayed

**Webhook Verification**:
```bash
# Check Stripe dashboard for successful payment
# Verify webhook endpoint received event
# Check application logs for webhook processing
```

---

### **T6: Stripe Checkout - Failed Payment**

**Objective**: Test failed payment handling

**Steps**:
1. Attempt token purchase
2. Use declined card: `4000000000000002`
3. Complete checkout process

**Expected Results**:
- ✅ Stripe reports payment failure
- ✅ User redirected to error page
- ✅ No tokens added to user account
- ✅ Error message displayed to user
- ✅ User can retry purchase

---

### **T7: Stripe Checkout - Authentication Required**

**Objective**: Test 3D Secure authentication flow

**Steps**:
1. Attempt purchase with auth card: `4000002500003155`
2. Complete 3D Secure authentication
3. Verify successful completion

**Expected Results**:
- ✅ 3D Secure challenge presented
- ✅ After authentication, payment succeeds
- ✅ Tokens added to account
- ✅ Normal success flow completed

---

### **T8: Multiple Token Packages**

**Objective**: Test different token package purchases

**Test Cases**:
- **5 tokens - $0.99**: Basic package
- **15 tokens - $2.49**: Popular package (best value)
- **50 tokens - $7.99**: Power user package

**For each package**:
1. Purchase package
2. Verify correct token amount added
3. Verify correct charge amount in Stripe
4. Check transaction records

---

### **T9: Concurrent Usage - Token Race Conditions**

**Objective**: Test token consistency under concurrent operations

**Steps**:
1. Login with user having 2 tokens
2. Open multiple browser tabs
3. Simultaneously attempt meme generation
4. Verify only allowed generations succeed

**Expected Results**:
- ✅ Only 2 generations succeed
- ✅ Remaining attempts show insufficient tokens
- ✅ No negative token balances
- ✅ Consistent state across all tabs

---

### **T10: Billing History & Transaction Log**

**Objective**: Verify billing history displays correctly

**Steps**:
1. Login with user who has made purchases
2. Navigate to billing page
3. Check transaction history

**Expected Results**:
- ✅ All purchases displayed with dates
- ✅ Token consumption history shown
- ✅ Current balance accurate
- ✅ Purchase receipts downloadable
- ✅ Pagination works for long histories

---

## 🐞 **Error Scenarios to Test**

### **E1: Webhook Failures**
- Test webhook endpoint downtime
- Verify payment success but webhook failure handling
- Test webhook retry mechanism

### **E2: Network Interruptions**
- Test checkout interruption during payment
- Verify incomplete payment handling
- Test session timeout scenarios

### **E3: Database Failures**
- Test Firestore write failures
- Verify error handling and user feedback
- Test retry mechanisms

### **E4: Rate Limiting**
- Test rapid generation attempts
- Verify rate limiting prevents abuse
- Test rate limit reset timing

---

## 📊 **Performance Tests**

### **P1: Load Testing Token Operations**
```bash
# Simulate multiple users purchasing tokens
# Measure webhook processing speed
# Test database performance under load
```

### **P2: Token Deduction Latency**
```bash
# Measure time from generation request to token deduction
# Test UI update responsiveness
# Verify no duplicate charges during slow responses
```

---

## 🔧 **Test Environment Setup**

### **Staging Environment Variables**
```bash
# Stripe Test Keys
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Test pricing IDs
STRIPE_5_TOKENS_PRICE_ID=price_test_...
STRIPE_15_TOKENS_PRICE_ID=price_test_...
STRIPE_50_TOKENS_PRICE_ID=price_test_...

# Firebase Test Project
FIREBASE_PROJECT_ID=mememe-staging
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mememe-staging
```

### **Test Data Cleanup**
```javascript
// Script to reset test user tokens
const resetTestUser = async (email) => {
  const user = await admin.auth().getUserByEmail(email);
  await admin.firestore().collection('users').doc(user.uid).update({
    tokensRemaining: 3,
    tokensPurchased: 0
  });
};
```

---

## 📋 **Test Checklist**

### **Pre-Testing**
- [ ] Staging environment deployed
- [ ] Test Stripe keys configured
- [ ] Test user accounts created
- [ ] Webhook endpoints configured
- [ ] Test payment methods ready

### **Token Flow Tests**
- [ ] T1: New user gets welcome tokens
- [ ] T2: Meme generation consumes tokens
- [ ] T3: Regeneration consumes tokens  
- [ ] T4: Zero tokens blocks generation
- [ ] T9: Concurrent usage handled correctly

### **Stripe Integration Tests**
- [ ] T5: Successful purchase flow
- [ ] T6: Failed payment handling
- [ ] T7: 3D Secure authentication
- [ ] T8: All token packages work
- [ ] T10: Billing history accurate

### **Error Handling**
- [ ] E1: Webhook failure recovery
- [ ] E2: Network interruption handling
- [ ] E3: Database failure recovery
- [ ] E4: Rate limiting functional

### **Performance**
- [ ] P1: Load testing completed
- [ ] P2: Latency within acceptable limits

---

## 📈 **Success Criteria**

**Token System**:
- ✅ 100% accuracy in token deduction
- ✅ No token balance inconsistencies
- ✅ All transactions properly logged
- ✅ UI updates reflect actual balances

**Stripe Integration**:
- ✅ 99%+ payment success rate for valid cards
- ✅ All webhook events processed correctly
- ✅ Failed payments handled gracefully
- ✅ No duplicate charges or missing payments

**User Experience**:
- ✅ Clear feedback for all states
- ✅ Intuitive purchase flow
- ✅ Accessible billing history
- ✅ Mobile-friendly checkout

---

**Testing Timeline**: 2-3 days for comprehensive testing
**Required Team**: 1-2 testers + 1 developer for fixes
**Completion Criteria**: All test cases pass with 95%+ success rate