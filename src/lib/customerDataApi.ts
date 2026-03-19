export async function submitCustomerData(payload: Record<string, unknown>) {
  const customerDataEndpoint = import.meta.env.VITE_CUSTOMER_DATA_API_PROXY_URL;

  if (!customerDataEndpoint) {
    throw new Error("Missing VITE_CUSTOMER_DATA_API_PROXY_URL in environment variables.");
  }

  if (/[?&]code=/i.test(customerDataEndpoint)) {
    throw new Error("Do not expose function keys in client URLs. Use a secure backend proxy URL.");
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
