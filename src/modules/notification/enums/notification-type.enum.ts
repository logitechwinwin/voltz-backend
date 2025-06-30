export enum NotificationType {
  NEW_MESSAGE = "new-message",
  NEW_MEMBER_JOINED_COMMUNITY = "new-member-join-community",
  NEW_EVENT_CREATED = "new-event-created",
  NEW_FOLLOWER = "new-follower",

  VOLTZ_REQUEST_STATUS = "voltz-request-status", // ** volunteer
  NEW_VOLUNTEER_REQUEST = "new-volunteer-request", // ** used on the panel of campaignManager & NGO

  DEAL_REQUEST_STATUS = "deal-request-status", // ** volunteer
  NEW_DEAL_REQUEST = "new-deal-request", // ** used on the panel of company

  VOLTZ_PURCHASED_BY_NGO = "voltz-purchased-by-ngo",
  NEW_KYC_SUBMITTED = "new-kyc-submitted",

  FOUNDATIONAL_VOLTZ_PURCHASED = "foundational-voltz-purchased",
}
