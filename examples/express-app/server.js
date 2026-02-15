import express from 'express';
import { mcpBridge } from '@mcp-bridge/express';

const app = express();
const PORT = process.env.PORT || 3000;

// Apply mcp-bridge middleware
app.use(
  mcpBridge({
    exclude: ['/api/*', '/health'],
    headers: {
      contentUsage: {
        aiInput: 'y',
        trainAi: 'n',
      },
      tokenCount: true,
    },
  }),
);

// Serve HTML pages
app.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Acme Corp - Building the future of AI infrastructure">
  <title>Home - Acme Corp</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    nav { background: #1a1a2e; color: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    nav a { color: white; text-decoration: none; margin-left: 1.5rem; }
    .hero { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4rem 2rem; text-align: center; }
    .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
    .hero p { font-size: 1.25rem; max-width: 600px; margin: 0 auto; }
    main { max-width: 800px; margin: 2rem auto; padding: 0 2rem; }
    footer { background: #f5f5f5; padding: 2rem; text-align: center; margin-top: 3rem; }
    .cookie-banner { position: fixed; bottom: 0; width: 100%; background: #333; color: white; padding: 1rem; text-align: center; }
    .ad-sidebar { background: #fffbe6; padding: 1rem; border: 1px solid #ffe58f; margin: 1rem 0; }
  </style>
  <script>console.log('analytics loaded');</script>
</head>
<body>
  <nav>
    <div class="logo">Acme Corp</div>
    <div>
      <a href="/">Home</a>
      <a href="/pricing">Pricing</a>
      <a href="/docs">Docs</a>
      <a href="/contact">Contact</a>
    </div>
  </nav>

  <div class="hero">
    <h1>Welcome to Acme Corp</h1>
    <p>Building the future of AI infrastructure. Fast, reliable, and developer-friendly.</p>
  </div>

  <main>
    <h2>What We Do</h2>
    <p>Acme Corp provides enterprise-grade AI infrastructure that scales with your needs. Our platform handles millions of requests per day with 99.99% uptime.</p>

    <h3>Key Features</h3>
    <ul>
      <li><strong>Lightning Fast</strong> - Sub-millisecond inference times</li>
      <li><strong>Scalable</strong> - From prototype to production seamlessly</li>
      <li><strong>Secure</strong> - SOC2 Type II certified, GDPR compliant</li>
      <li><strong>Developer First</strong> - SDKs for every major language</li>
    </ul>

    <div class="ad-sidebar">
      <p>SPONSORED: Try our premium plan free for 30 days!</p>
    </div>

    <h3>Trusted By</h3>
    <p>Over 10,000 companies trust Acme Corp for their AI infrastructure needs.</p>
  </main>

  <footer>
    <p>&copy; 2026 Acme Corp. All rights reserved.</p>
    <p>Terms of Service | Privacy Policy | Cookie Policy</p>
  </footer>

  <div class="cookie-banner">
    <p>We use cookies to improve your experience. <button>Accept</button> <button>Decline</button></p>
  </div>

  <script src="https://cdn.example.com/tracking.js"></script>
</body>
</html>`);
});

app.get('/pricing', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="description" content="Simple, transparent pricing for teams of all sizes.">
  <title>Pricing - Acme Corp</title>
  <link rel="canonical" href="https://acme.com/pricing">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #333; }
    nav { background: #1a1a2e; color: white; padding: 1rem 2rem; }
    nav a { color: white; text-decoration: none; margin-left: 1.5rem; }
    main { max-width: 900px; margin: 2rem auto; padding: 0 2rem; }
    .plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin: 2rem 0; }
    .plan { border: 1px solid #ddd; border-radius: 8px; padding: 2rem; }
    .plan h3 { margin-bottom: 0.5rem; }
    .plan .price { font-size: 2rem; font-weight: bold; margin: 1rem 0; }
    .plan ul { list-style: none; padding: 0; }
    .plan li { padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    footer { background: #f5f5f5; padding: 2rem; text-align: center; margin-top: 3rem; }
  </style>
</head>
<body>
  <nav data-llm-ignore>
    <span>Acme Corp</span>
    <a href="/">Home</a>
    <a href="/pricing">Pricing</a>
    <a href="/docs">Docs</a>
  </nav>

  <main data-llm-content>
    <h1>Pricing</h1>
    <p>Simple, transparent pricing for teams of all sizes.</p>

    <div class="plans">
      <div class="plan">
        <h3>Free</h3>
        <div class="price">$0</div>
        <p>Perfect for getting started</p>
        <ul>
          <li>1,000 API calls/month</li>
          <li>Community support</li>
          <li>1 team member</li>
          <li>Basic analytics</li>
        </ul>
      </div>

      <div class="plan">
        <h3>Pro</h3>
        <div class="price">$29/month</div>
        <p>For growing teams</p>
        <ul>
          <li>100,000 API calls/month</li>
          <li>Priority support</li>
          <li>Unlimited team members</li>
          <li>Advanced analytics</li>
          <li>Custom models</li>
        </ul>
      </div>

      <div class="plan">
        <h3>Enterprise</h3>
        <div class="price">Custom</div>
        <p>For large organizations</p>
        <ul>
          <li>Unlimited API calls</li>
          <li>Dedicated support</li>
          <li>SLA guarantee</li>
          <li>On-premise deployment</li>
          <li>Custom integrations</li>
          <li>SOC2 compliance</li>
        </ul>
      </div>
    </div>

    <h2>FAQ</h2>
    <h3>Can I switch plans?</h3>
    <p>Yes, you can upgrade or downgrade at any time. Changes take effect immediately.</p>

    <h3>Do you offer discounts?</h3>
    <p>We offer 20% off for annual billing and special pricing for startups and non-profits.</p>
  </main>

  <footer data-llm-ignore>
    <p>&copy; 2026 Acme Corp. All rights reserved.</p>
  </footer>
</body>
</html>`);
});

// JSON API endpoint (should be excluded from transformation)
app.get('/api/data', (_req, res) => {
  res.json({
    status: 'ok',
    items: [
      { id: 1, name: 'Widget A', price: 9.99 },
      { id: 2, name: 'Widget B', price: 19.99 },
    ],
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Example server running at http://localhost:${PORT}`);
  console.log('');
  console.log('Try these commands:');
  console.log(`  curl http://localhost:${PORT}/`);
  console.log(`  curl -H "Accept: text/markdown" http://localhost:${PORT}/`);
  console.log(`  curl -H "User-Agent: ClaudeBot/1.0" http://localhost:${PORT}/pricing`);
  console.log(`  curl -H "Accept: text/markdown" http://localhost:${PORT}/api/data`);
});
