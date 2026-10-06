export const RESTAURANT_NAME = process.env.NEXT_PUBLIC_RESTAURANT_NAME || 'Our Restaurant';
export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '';
export const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME || RESTAURANT_NAME;

export const money = (n) => '₹' + Number(n).toLocaleString('en-IN');

// Builds the link that opens GPay / PhonePe / Paytm / any UPI app
// with the amount and the order reference already filled in.
export function upiLink({ number, total }) {
  const parts = [
    'pa=' + encodeURIComponent(UPI_ID),
    'pn=' + encodeURIComponent(UPI_NAME),
    'am=' + Number(total).toFixed(2),
    'cu=INR',
    'tn=' + encodeURIComponent('Order ' + number),
    'tr=ORD' + number,
  ];
  return 'upi://pay?' + parts.join('&');
}
