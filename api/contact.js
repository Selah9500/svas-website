export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, problem, information, tools, goal } = req.body;

  if (!name || !email || !problem) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SVAS Contact Form <support@svasph.com>',
        to: ['support@svasph.com'],
        reply_to: email,
        subject: `New Brief from ${name} — SVAS`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;border-radius:12px;overflow:hidden;">
            
            <div style="background:linear-gradient(135deg,#3aaa35,#1a6e17);padding:28px 32px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,0.7)">New PICF Brief</p>
              <h1 style="margin:6px 0 0;font-size:22px;font-weight:800;color:#fff">From: ${name}</h1>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8)">${email}</p>
            </div>

            <div style="padding:28px 32px;">

              <div style="margin-bottom:20px;background:#111;border-radius:10px;overflow:hidden;border:1px solid #222;">
                <div style="background:#161f16;padding:10px 16px;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px;">
                  <span style="background:linear-gradient(135deg,#3aaa35,#1a6e17);color:#fff;font-weight:800;font-size:12px;width:22px;height:22px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;">P</span>
                  <span style="font-weight:700;font-size:13px;color:#fff;">Problem</span>
                </div>
                <div style="padding:14px 16px;font-size:14px;color:#bbb;line-height:1.65;">${problem}</div>
              </div>

              <div style="margin-bottom:20px;background:#111;border-radius:10px;overflow:hidden;border:1px solid #222;">
                <div style="background:#161f16;padding:10px 16px;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px;">
                  <span style="background:linear-gradient(135deg,#3aaa35,#1a6e17);color:#fff;font-weight:800;font-size:12px;width:22px;height:22px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;">I</span>
                  <span style="font-weight:700;font-size:13px;color:#fff;">Information & Context</span>
                </div>
                <div style="padding:14px 16px;font-size:14px;color:#bbb;line-height:1.65;">${information}</div>
              </div>

              <div style="margin-bottom:20px;background:#111;border-radius:10px;overflow:hidden;border:1px solid #222;">
                <div style="background:#161f16;padding:10px 16px;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px;">
                  <span style="background:linear-gradient(135deg,#3aaa35,#1a6e17);color:#fff;font-weight:800;font-size:12px;width:22px;height:22px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;">C</span>
                  <span style="font-weight:700;font-size:13px;color:#fff;">Current Tools</span>
                </div>
                <div style="padding:14px 16px;font-size:14px;color:#bbb;line-height:1.65;">${tools}</div>
              </div>

              <div style="margin-bottom:20px;background:#111;border-radius:10px;overflow:hidden;border:1px solid #222;">
                <div style="background:#161f16;padding:10px 16px;border-bottom:1px solid #222;display:flex;align-items:center;gap:10px;">
                  <span style="background:linear-gradient(135deg,#3aaa35,#1a6e17);color:#fff;font-weight:800;font-size:12px;width:22px;height:22px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;">F</span>
                  <span style="font-weight:700;font-size:13px;color:#fff;">Final Goal</span>
                </div>
                <div style="padding:14px 16px;font-size:14px;color:#bbb;line-height:1.65;">${goal}</div>
              </div>

            </div>

            <div style="padding:16px 32px 24px;text-align:center;border-top:1px solid #1a1a1a;">
              <p style="margin:0;font-size:12px;color:#555;">Sent via svasph.com · Reply directly to this email to respond to ${name}</p>
            </div>

          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
