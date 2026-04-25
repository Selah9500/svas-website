// SVAS Contact Form API
// Receives PICF brief → Analyzes with Claude → Generates n8n workflow recommendation → Sends 2 emails
//
// REQUIRED ENV VARS in Vercel:
//   RESEND_API_KEY   = your Resend API key
//   ANTHROPIC_API_KEY = your Anthropic API key
//   BOOKING_LINK     = your Calendly/Cal.com URL (optional, defaults to mailto)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, problem, information, tools, goal } = req.body;

  if (!name || !email || !problem) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const BOOKING_LINK = process.env.BOOKING_LINK || 'mailto:support@svasph.com?subject=Re: Your SVAS Brief';

  // ─────────────────────────────────────────────────
  // STEP 1: Analyze the brief with Claude
  // ─────────────────────────────────────────────────
  let aiRecommendation = null;
  let workflowSteps = [];

  try {
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are Elah Sayson, an AI Systems Architect specializing in n8n, Make, and Zapier workflow automation. A potential client has submitted a PICF brief. Analyze their situation and recommend a specific n8n-based workflow that solves their problem.

**Client Brief:**
- Problem: ${problem}
- Information & Context: ${information}
- Current Tools: ${tools}
- Final Goal: ${goal}

**Your task:**
Respond ONLY with valid JSON in this exact format (no markdown, no preamble):
{
  "summary": "1-2 sentence diagnosis of the core issue, written warmly and directly to the client",
  "workflow_name": "A clear name for the recommended n8n workflow",
  "workflow_steps": [
    {"step": 1, "trigger_or_action": "Trigger", "tool": "Tool name", "description": "What happens here in 1 sentence"},
    {"step": 2, "trigger_or_action": "Action", "tool": "Tool name", "description": "What happens here in 1 sentence"}
  ],
  "estimated_time_saved": "Realistic estimate like '5-8 hours per week' or '15+ hours per month'",
  "next_steps": "1-2 sentences explaining what would happen next if they want to proceed"
}

Keep it specific to THEIR tools and problem. If they mention Shopify, use Shopify in the workflow. If they say Google Sheets, use Google Sheets. Build the workflow logically: trigger → process → action → notify. Aim for 4-6 steps.`
        }],
      }),
    });

    const claudeData = await claudeResponse.json();

    if (claudeResponse.ok && claudeData.content?.[0]?.text) {
      aiRecommendation = JSON.parse(claudeData.content[0].text);
      workflowSteps = aiRecommendation.workflow_steps || [];
    }
  } catch (err) {
    console.error('Claude analysis failed:', err);
  }

  // ─────────────────────────────────────────────────
  // STEP 2: Build the AI workflow HTML block
  // ─────────────────────────────────────────────────
  const workflowHtml = workflowSteps.map((s) => `
    <div style="display:flex;gap:14px;align-items:flex-start;padding:12px 14px;background:#0f1f0f;border:1px solid rgba(58,170,53,0.2);border-radius:10px;margin-bottom:8px;">
      <div style="background:linear-gradient(135deg,#3aaa35,#1a6e17);color:#fff;font-weight:800;font-size:13px;width:26px;height:26px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">${s.step}</div>
      <div style="flex:1;">
        <div style="font-size:11px;color:#3aaa35;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:2px;">${s.trigger_or_action} · ${s.tool}</div>
        <div style="font-size:13px;color:#ccc;line-height:1.5;">${s.description}</div>
      </div>
    </div>
  `).join('');

  const aiSection = aiRecommendation && aiRecommendation.summary ? `
    <div style="margin-top:32px;padding-top:28px;border-top:1px solid #1f1f1f;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(58,170,53,0.1);border:1px solid rgba(58,170,53,0.3);padding:5px 12px;border-radius:99px;margin-bottom:18px;">
        <span style="width:6px;height:6px;background:#3aaa35;border-radius:50%;"></span>
        <span style="font-size:10px;color:#3aaa35;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">AI-Generated Initial Analysis</span>
      </div>

      <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 12px;line-height:1.2;">Here's what I'm thinking, ${name.split(' ')[0]}.</h2>
      <p style="font-size:14px;color:#bbb;line-height:1.7;margin:0 0 24px;">${aiRecommendation.summary}</p>

      <h3 style="font-size:11px;color:#888;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:24px 0 12px;">Proposed Workflow</h3>
      <div style="background:#0a0a0a;padding:18px;border-radius:12px;border:1px solid #1a1a1a;">
        <div style="font-family:monospace;font-size:13px;color:#3aaa35;font-weight:700;margin-bottom:14px;">⚙️ ${aiRecommendation.workflow_name}</div>
        ${workflowHtml}
      </div>

      <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;">
        <div style="flex:1;min-width:180px;background:#0a0a0a;padding:14px 16px;border-radius:10px;border:1px solid #1a1a1a;">
          <div style="font-size:10px;color:#888;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Estimated Time Saved</div>
          <div style="font-size:15px;color:#3aaa35;font-weight:700;">${aiRecommendation.estimated_time_saved}</div>
        </div>
      </div>

      <p style="font-size:13px;color:#999;line-height:1.7;margin:24px 0 0;">${aiRecommendation.next_steps}</p>
    </div>
  ` : '';

  // ─────────────────────────────────────────────────
  // STEP 3: Email to the LEAD
  // ─────────────────────────────────────────────────
  const picfBlocks = [
    { letter: 'P', label: 'Problem', value: problem },
    { letter: 'I', label: 'Information & Context', value: information },
    { letter: 'C', label: 'Current Tools', value: tools },
    { letter: 'F', label: 'Final Goal', value: goal },
  ].map(b => `
    <div style="margin-bottom:14px;background:#111;border-radius:10px;overflow:hidden;border:1px solid #1f1f1f;">
      <div style="background:#161f16;padding:9px 14px;border-bottom:1px solid #1f1f1f;display:flex;align-items:center;gap:10px;">
        <span style="background:linear-gradient(135deg,#3aaa35,#1a6e17);color:#fff;font-weight:800;font-size:11px;width:20px;height:20px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;">${b.letter}</span>
        <span style="font-weight:700;font-size:12px;color:#fff;">${b.label}</span>
      </div>
      <div style="padding:11px 14px;font-size:13px;color:#bbb;line-height:1.6;">${b.value}</div>
    </div>
  `).join('');

  const leadEmailHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;border-radius:14px;overflow:hidden;border:1px solid #1a1a1a;">

      <div style="background:linear-gradient(135deg,#3aaa35,#1a6e17);padding:32px;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.75);">Brief Received · SVAS</p>
        <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#fff;line-height:1.2;">Thanks ${name.split(' ')[0]} — I've got your brief.</h1>
      </div>

      <div style="padding:28px 32px;">

        <p style="font-size:14px;color:#bbb;line-height:1.7;margin:0 0 24px;">Here's a recap of what you sent over, plus an initial AI-generated analysis to give you a head start. We can refine this together once we connect.</p>

        <h3 style="font-size:11px;color:#888;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Your Brief (PICF)</h3>

        ${picfBlocks}

        ${aiSection}

        <div style="margin-top:32px;padding:24px;background:linear-gradient(135deg,#0f1f0f,#0a0a0a);border:1px solid rgba(58,170,53,0.25);border-radius:12px;text-align:center;">
          <h3 style="font-size:16px;font-weight:800;color:#fff;margin:0 0 6px;">Want to refine this?</h3>
          <p style="font-size:13px;color:#999;margin:0 0 18px;line-height:1.6;">Book a free 30-minute call or just reply to this email. I read every message personally and respond within 24 hours.</p>

          <a href="${BOOKING_LINK}" style="display:inline-block;background:linear-gradient(135deg,#3aaa35,#1a6e17);color:#fff;font-weight:700;font-size:13px;padding:11px 24px;border-radius:99px;text-decoration:none;margin-right:8px;">Book a Call →</a>
          <a href="mailto:support@svasph.com?subject=Re: My SVAS Brief - ${encodeURIComponent(name)}" style="display:inline-block;background:transparent;border:1px solid #333;color:#ccc;font-weight:600;font-size:13px;padding:10px 22px;border-radius:99px;text-decoration:none;">Reply by Email</a>
        </div>

      </div>

      <div style="padding:18px 32px;border-top:1px solid #1a1a1a;text-align:center;">
        <p style="margin:0;font-size:11px;color:#555;line-height:1.6;">
          <strong style="color:#888;">Elah Sayson</strong> · AI Systems Architect<br>
          Sayson Virtual Assistance Services (SVAS) · Philippines<br>
          <a href="https://svasph.com" style="color:#3aaa35;text-decoration:none;">svasph.com</a>
        </p>
      </div>

    </div>
  `;

  // ─────────────────────────────────────────────────
  // STEP 4: Email to ELAH
  // ─────────────────────────────────────────────────
  const ownerEmailHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;border-radius:14px;overflow:hidden;border:1px solid #1a1a1a;">

      <div style="background:linear-gradient(135deg,#3aaa35,#1a6e17);padding:28px 32px;">
        <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.7);">New Lead · PICF Brief</p>
        <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#fff;">${name}</h1>
        <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);"><a href="mailto:${email}" style="color:#fff;text-decoration:underline;">${email}</a></p>
      </div>

      <div style="padding:28px 32px;">

        ${picfBlocks}

        ${aiRecommendation && aiRecommendation.workflow_name ? `
          <div style="margin-top:24px;padding:18px;background:#0a1a0a;border:1px solid rgba(58,170,53,0.2);border-radius:10px;">
            <p style="margin:0 0 8px;font-size:10px;color:#3aaa35;font-weight:700;letter-spacing:2px;text-transform:uppercase;">⚡ AI sent this recommendation to ${name.split(' ')[0]}:</p>
            <p style="margin:0 0 4px;font-weight:700;color:#fff;font-size:13px;">${aiRecommendation.workflow_name}</p>
            <p style="margin:0;font-size:12px;color:#999;">Time saved estimate: <strong style="color:#3aaa35;">${aiRecommendation.estimated_time_saved}</strong></p>
          </div>
        ` : ''}

      </div>

      <div style="padding:14px 32px;border-top:1px solid #1a1a1a;text-align:center;">
        <p style="margin:0;font-size:11px;color:#555;">Reply directly to this email to respond to ${name.split(' ')[0]}.</p>
      </div>

    </div>
  `;

  // ─────────────────────────────────────────────────
  // STEP 5: Fire both emails via Resend
  // ─────────────────────────────────────────────────
  try {
    const sendEmail = (to, subject, html, replyTo) => fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Elah Sayson <support@svasph.com>',
        to: [to],
        reply_to: replyTo,
        subject: subject,
        html: html,
      }),
    });

    const [ownerRes, leadRes] = await Promise.all([
      sendEmail('support@svasph.com', `New Brief from ${name} — SVAS`, ownerEmailHtml, email),
      sendEmail(email, `Your SVAS brief + initial automation recommendation`, leadEmailHtml, 'support@svasph.com'),
    ]);

    if (!ownerRes.ok || !leadRes.ok) {
      throw new Error('One or both emails failed to send');
    }

    return res.status(200).json({ success: true, hasRecommendation: !!aiRecommendation });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
