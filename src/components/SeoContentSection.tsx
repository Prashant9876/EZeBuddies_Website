import { useLanguage } from "@/lib/language";

export function SeoContentSection() {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  if (isHindi) {
    return (
      <section className="bg-muted/20 py-16" aria-labelledby="seo-overview-heading">
        <div className="container mx-auto px-6">
          <h2 id="seo-overview-heading" className="font-display text-3xl font-bold text-foreground mb-4">
            इंडस्ट्रियल IoT मॉनिटरिंग और ऑटोमेशन समाधान
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            EzeBuddies भारत में इंडस्ट्रियल IoT, स्मार्ट सिंचाई, क्लाइमेट मॉनिटरिंग और पंप ऑटोमेशन के लिए प्रैक्टिकल समाधान बनाता है।
            हमारी मुख्य डिवाइस लाइन में <strong>Vatavaran Monitor</strong>, <strong>Smart Sinchai</strong> और <strong>Pump Sathi</strong> शामिल हैं।
            ये उत्पाद तापमान, आर्द्रता, CO2, पानी की मात्रा, टैंक लेवल और एक्ट्यूएशन कंट्रोल को एक ही सिस्टम में लाकर ऑपरेशन को सरल बनाते हैं।
          </p>
          <h3 className="text-xl font-semibold text-foreground mb-2">हमारे समाधान कहाँ उपयोग होते हैं</h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            हमारे IoT सिस्टम ग्रीनहाउस, नेट-हाउस, CEA फार्म, पोल्ट्री, डेयरी, पार्क, स्टेडियम टर्फ, जल इंफ्रास्ट्रक्चर और इंडस्ट्रियल यूटिलिटी
            उपयोगों में अपनाए जा सकते हैं। सिस्टम इस तरह डिज़ाइन किए जाते हैं कि साइट पर बार-बार मैनुअल हस्तक्षेप कम हो, अलर्ट समय पर मिले और
            ऑपरेशन डेटा-आधारित हो।
          </p>
          <h3 className="text-xl font-semibold text-foreground mb-2">मुख्य लाभ</h3>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>रियल-टाइम क्लाइमेट और प्रक्रिया मॉनिटरिंग</li>
            <li>सेंसर डेटा के आधार पर ऑटोमेटेड कंट्रोल लॉजिक</li>
            <li>दूरस्थ मॉनिटरिंग और तेज़ समस्या प्रतिक्रिया</li>
            <li>पानी, ऊर्जा और श्रम उपयोग में सुधार</li>
            <li>मल्टी-साइट डिप्लॉयमेंट के लिए स्केलेबल आर्किटेक्चर</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            हमारे समाधान के बारे में अधिक जानने के लिए <a href="#products" className="text-primary underline underline-offset-4">प्रोडक्ट सेक्शन</a> देखें,
            और यदि आप वातावारण डिवाइस के लिए पायलट में शामिल होना चाहते हैं तो{" "}
            <a href="/pre-launch/vatavaran-monitor" className="text-primary underline underline-offset-4">प्री-लॉन्च पेज</a> पर जाएं।
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-muted/20 py-16" aria-labelledby="seo-overview-heading">
      <div className="container mx-auto px-6">
        <h2 id="seo-overview-heading" className="font-display text-3xl font-bold text-foreground mb-4">
          Industrial IoT Monitoring and Automation Solutions
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-4">
          EzeBuddies builds practical <strong>industrial IoT automation</strong> products for teams that need reliable monitoring and control
          across climate, irrigation, and water operations. Our core portfolio includes <strong>Vatavaran Monitor</strong>,{" "}
          <strong>Smart Sinchai</strong>, and <strong>Pump Sathi</strong>. These systems help operators monitor temperature, humidity, CO2,
          tank levels, flow conditions, and controller status in real time while automating repetitive field actions.
        </p>
        <p className="text-muted-foreground leading-relaxed mb-4">
          In many deployments, operations still depend on manual checks, delayed escalation, and fragmented control logic. Our approach is to
          combine sensor visibility and actuation workflows in one stack, so teams can make faster decisions and run processes with less guesswork.
          For agriculture and utility environments, this can directly improve irrigation consistency, reduce avoidable failure windows, and improve
          response time during threshold breaches.
        </p>
        <h3 className="text-xl font-semibold text-foreground mb-2">Use Cases We Support</h3>
        <p className="text-muted-foreground leading-relaxed mb-4">
          We support controlled environment agriculture, greenhouse climate control, smart irrigation scheduling, pump automation, parks and landscaping,
          stadium turf management, and utility monitoring. Solutions are designed for real deployment conditions including mixed connectivity, distributed
          site layouts, and non-technical operator workflows.
        </p>
        <h3 className="text-xl font-semibold text-foreground mb-2">Why Teams Choose EzeBuddies</h3>
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          <li>Real-time telemetry and automation-ready control stack</li>
          <li>Faster alerts and better root-cause visibility</li>
          <li>Reduced manual rounds and repetitive switching tasks</li>
          <li>Deployment support from consultation to commissioning</li>
          <li>Custom IoT engineering support when standard products are not enough</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-4">
          Explore our <a href="#products" className="text-primary underline underline-offset-4">IoT product portfolio</a> and detailed use-cases,
          or visit the{" "}
          <a href="/pre-launch/vatavaran-monitor" className="text-primary underline underline-offset-4">
            Vatavaran Monitor pre-launch page
          </a>{" "}
          to request early access.
        </p>
      </div>
    </section>
  );
}
