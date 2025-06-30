export class EventQueryHelper {
  static buildOngoingQuery(): string {
    return `
        (
          (${this.isCharityOngoing()}) OR
          (${this.isCampaignOngoing()})
        )
      `;
  }

  static buildUpcomingQuery(): string {
    return `
        events.startDate > :todayDate AND
        events.closed IS NULL
      `;
  }

  static buildExpiredQuery(): string {
    return `
        (
          (${this.isCharityExpired()}) OR
          (${this.isCampaignExpired()})
        )
      `;
  }

  private static isCharityOngoing(): string {
    return `
        events.type = :charity AND
        events.startDate <= :todayDate AND
        (events.endDate IS NULL OR events.endDate > :todayDate) AND
        (events.donationRequired IS NULL OR events.donationRequired != events.donationReceived) AND
        events.closed IS NULL
      `;
  }

  private static isCampaignOngoing(): string {
    return `
        events.type = :campaign AND
        events.startDate <= :todayDate AND
        events.endDate > :todayDate AND
        events.closed IS NULL
      `;
  }

  private static isCharityExpired(): string {
    return `
        events.type = :charity AND
        (
          (
            events.startDate <= :todayDate AND
            (
              (events.endDate IS NOT NULL AND events.endDate < :todayDate) OR
              (events.donationRequired IS NOT NULL AND events.donationRequired = events.donationReceived)
            )
          ) OR
          events.closed IS NOT NULL
        )
      `;
  }

  private static isCampaignExpired(): string {
    return `
        events.type = :campaign AND
        (
          (
            events.startDate <= :todayDate AND
            events.endDate < :todayDate
          ) OR
          events.closed IS NOT NULL
        )
      `;
  }
}
