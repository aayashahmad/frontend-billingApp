/**
 * How long a debt has been outstanding, as a shopkeeper would say it.
 *
 * Kept out of the component so it can be tested without dragging in the
 * native icon font chain — and because "how long is this overdue" is a
 * question about the data, not about how a card looks.
 */
export const overdueLabel = (days) => {
  // Days stay exact up to two months: the difference between 31 and 59 days
  // is one the shop acts on, and "1 month" throws it away.
  if (days < 60) return `${days} ${days === 1 ? 'day' : 'days'} overdue`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months overdue`;

  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} overdue`;
};

export default overdueLabel;
