import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

from app.core.config import settings
from app.services.writer import generate_cover_letter


def detect_ats(url: str) -> str:
    if not url: return "Other"
    if "greenhouse.io" in url: return "Greenhouse"
    if "lever.co" in url: return "Lever"
    if "ashbyhq.com" in url: return "Ashby"
    if "myworkday" in url: return "Workday"
    if "uber.com" in url: return "Uber"
    if "linkedin.com" in url: return "LinkedIn"
    if "icims.com" in url: return "iCIMS"
    if "smartrecruiters.com" in url: return "SmartRecruiters"
    if "jobvite.com" in url: return "Jobvite"
    if "taleo.net" in url: return "Taleo"
    if "workable.com" in url: return "Workable"
    return "Other"

def send_digest(top_jobs: list) -> None:
    """Send daily job digest email with cover letters."""

    today = datetime.now().strftime("%B %d, %Y")

    # Sort by ATS so user can batch-apply platform by platform
    top_jobs = sorted(top_jobs, key=lambda j: (detect_ats(j.url), -j.match_score))

    print(f"Generating cover letters for {len(top_jobs)} jobs...")
    job_sections = ""
    current_ats = None

    for i, job in enumerate(top_jobs, 1):
        salary = ""
        if job.salary_min and job.salary_max:
            salary = f"${job.salary_min:,} – ${job.salary_max:,}"
        elif job.salary_min:
            salary = f"${job.salary_min:,}+"

        score_pct = int(job.match_score * 100)
        location = job.location or "Remote"
        ats = detect_ats(job.url)

        # Add ATS section header when platform changes
        if ats != current_ats:
            current_ats = ats
            ats_colors = {
                "Greenhouse": "#24a148", "Lever": "#0055a5", "Workday": "#e3051b",
                "Uber": "#000000", "Ashby": "#7c3aed", "LinkedIn": "#0077b5",
                "iCIMS": "#f47920", "SmartRecruiters": "#00b140",
            }
            color = ats_colors.get(ats, "#555")
            job_sections += f"""
            <div style="margin: 28px 0 12px; padding: 8px 14px; background: {color}; border-radius: 6px; display: inline-block;">
                <span style="color: white; font-weight: 700; font-size: 13px; letter-spacing: 0.05em;">
                    {ats.upper()} — use JobRadar extension
                </span>
            </div>"""

        print(f"  [{i}/{len(top_jobs)}] Generating for {job.title} @ {job.company}...")
        why_fit, cover_letter = generate_cover_letter(job)

        cover_letter_html = "".join(
            f"<p style='margin: 6px 0; color: #333;'>{p.strip()}</p>"
            for p in cover_letter.split("\n\n") if p.strip()
        )

        job_sections += f"""
        <div style="border: 1px solid #dde; border-radius: 8px; padding: 16px; margin-bottom: 20px; background: #fafafa;">

            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                    <span style="font-size: 16px; font-weight: 700; color: #0d0d0d;">
                        #{i} &nbsp;
                        <a href="{job.url}" style="color: #1a5c8a; text-decoration: none;">{job.title}</a>
                    </span>
                    <br>
                    <span style="color: #555; font-size: 13px;">{job.company} &nbsp;·&nbsp; {location}{' &nbsp;·&nbsp; ' + salary if salary else ''}</span>
                </div>
                <span style="background: #1a5c8a; color: white; padding: 4px 10px; border-radius: 14px; font-size: 13px; white-space: nowrap;">
                    {score_pct}% match
                </span>
            </div>

            <div style="background: #e8f0f8; border-left: 3px solid #1a5c8a; padding: 8px 12px; margin: 10px 0; border-radius: 0 4px 4px 0;">
                <span style="font-size: 12px; color: #1a5c8a; font-weight: 600;">WHY YOU FIT &nbsp;</span>
                <span style="font-size: 13px; color: #333;">{why_fit}</span>
            </div>

            <div style="background: #fff; border: 1px solid #eee; border-radius: 4px; padding: 12px; margin-top: 8px;">
                <div style="font-size: 11px; color: #999; font-weight: 600; margin-bottom: 6px;">COVER LETTER — COPY &amp; PASTE</div>
                {cover_letter_html}
            </div>

            <div style="margin-top: 10px;">
                <a href="{job.url}" style="background: #1a5c8a; color: white; padding: 6px 14px; border-radius: 4px; text-decoration: none; font-size: 13px;">
                    Apply Now →
                </a>
            </div>

        </div>
        """

    html = f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 750px; margin: 0 auto; padding: 20px;">

        <h2 style="color: #1a5c8a; border-bottom: 2px solid #1a5c8a; padding-bottom: 8px;">
            JobRadar Daily Digest — {today}
        </h2>
        <p style="color: #555; margin-bottom: 20px;">
            Top {len(top_jobs)} matches · Cover letters pre-written · Target: 1 hour, 20 applications
        </p>

        {job_sections}

        <p style="color: #bbb; font-size: 11px; margin-top: 20px; text-align: center;">
            Powered by JobRadar · {today}
        </p>

    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"JobRadar {today} — {len(top_jobs)} jobs, cover letters ready"
    msg["From"] = settings.GMAIL_USER
    msg["To"] = settings.GMAIL_USER
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.GMAIL_USER, settings.GMAIL_APP_PASSWORD)
        server.sendmail(settings.GMAIL_USER, settings.GMAIL_USER, msg.as_string())

    print(f"Digest sent to {settings.GMAIL_USER}")
