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
  EQUAL = 'equal',
  /** Split by selecting specific items for each person */
  BY_ITEMS = 'by_items',
  /** Split by percentage for each person */
  BY_PERCENTAGE = 'by_percentage',
  /** Split by custom amount for each person */
  BY_AMOUNT = 'by_amount'
}