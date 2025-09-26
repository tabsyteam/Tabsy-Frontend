/**
 * Payment type enum for type-safe payment handling
 */
export enum PaymentType {
  /** Payment for a single order */
  ORDER = 'order',
  /** Payment for entire table session bill */
  TABLE_SESSION = 'table_session',
  /** Split bill payment among multiple users */
  SPLIT_BILL = 'split_bill'
}

/**
 * Split bill type enum for different split options
 */
export enum SplitBillType {
  /** Split the bill equally among all participants */
  EQUAL = 'EQUAL',
  /** Split by selecting specific items for each person */
  BY_ITEMS = 'BY_ITEMS',
  /** Split by percentage for each person */
  BY_PERCENTAGE = 'BY_PERCENTAGE',
  /** Split by custom amount for each person */
  BY_AMOUNT = 'BY_AMOUNT'
}