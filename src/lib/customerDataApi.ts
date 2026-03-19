export async function submitCustomerData(payload: Record<string, unknown>) {
  const customerDataEndpoint = import.meta.env.VITE_CUSTOMER_DATA_API_PROXY_URL || "/api/customer-data";

  if (/^https?:\/\//i.test(customerDataEndpoint) && /[?&]code=/i.test(customerDataEndpoint)) {
    throw new Error("Do not expose function keys in client URLs. Use a secure proxy URL.");
  }

  const response = await fetch(customerDataEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Customer data API failed (${response.status}): ${errorText}`);
  }

  return response;
}
