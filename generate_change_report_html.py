#!/usr/bin/env python3
"""
Generate beautiful HTML change report for CRICOS data updates
Creates both JSON and HTML reports for viewing and sharing
"""

import json
from pathlib import Path
from datetime import datetime

REPORT_DIR = 'data_reports'
HTML_REPORT_DIR = 'data_reports/html'

# Ensure HTML report directory exists
Path(HTML_REPORT_DIR).mkdir(parents=True, exist_ok=True)

def load_latest_report():
    """Load the latest JSON report."""
    report_files = sorted(Path(REPORT_DIR).glob('update_report_*.json'), reverse=True)
    if not report_files:
        return None

    with open(report_files[0], 'r', encoding='utf-8') as f:
        return json.load(f), report_files[0].name

def load_all_reports():
    """Load all reports for history."""
    reports = []
    for report_file in sorted(Path(REPORT_DIR).glob('update_report_*.json'), reverse=True):
        with open(report_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            reports.append({
                'filename': report_file.name,
                'timestamp': data.get('timestamp'),
                'summary': data.get('summary', {}),
                'changes': data.get('changes', {})
            })
    return reports

def format_timestamp(ts):
    """Format ISO timestamp to readable date."""
    if not ts:
        return 'Unknown'
    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
    return dt.strftime('%d %b %Y, %H:%M:%S')

def render_added_institutions(institutions):
    """Render added institutions section."""
    if not institutions:
        return '<div class="empty-message">No new institutions</div>'

    html = ''
    for inst in institutions:
        html += f'<div class="change-item added"><div class="change-title">{inst}</div></div>'
    return html

def render_added_courses(courses):
    """Render added courses section."""
    if not courses:
        return '<div class="empty-message">No new courses</div>'

    html = ''
    for i, course in enumerate(courses[:50]):
        html += f'''<div class="change-item added">
            <div class="change-title">{course.get('course', 'N/A')}</div>
            <div class="change-detail">{course.get('institution', 'N/A')} (Code: {course.get('code', 'N/A')})</div>
        </div>'''

    if len(courses) > 50:
        html += f'<div class="change-item" style="background: #f0f0f0; border-left: none; text-align: center;">... and {len(courses) - 50} more courses</div>'

    return html

def render_modified_courses(courses):
    """Render modified courses table."""
    if not courses:
        return '<tr><td colspan="3" style="text-align: center; color: #999;">No modifications</td></tr>'

    html = ''
    for course in courses:
        changes_html = ''
        for key, change_info in course.get('changes', {}).items():
            old_val = change_info.get('old', 'N/A')
            new_val = change_info.get('new', 'N/A')
            changes_html += f'<div style="margin-bottom: 4px;"><span class="badge modified">{key}</span>: {old_val} → {new_val}</div>'

        html += f'''<tr>
            <td>{course.get('course_name', 'N/A')}</td>
            <td>{course.get('institution', 'N/A')}</td>
            <td>{changes_html}</td>
        </tr>'''

    return html

def generate_html_report(report, filename):
    """Generate HTML report from JSON data."""
    summary = report.get('summary', {})
    changes = report.get('changes', {})
    timestamp = report.get('timestamp', '')

    added_institutions = changes.get('added_institutions', [])
    removed_institutions = changes.get('removed_institutions', [])
    added_courses = changes.get('added_courses', [])
    removed_courses = changes.get('removed_courses', [])
    modified_courses = changes.get('modified_courses', [])
    modified_institutions = changes.get('modified_institutions', [])

    old_institutions = summary.get('old_institutions', 0)
    new_institutions = summary.get('new_institutions', 0)
    old_courses = summary.get('old_total_courses', 0)
    new_courses = summary.get('new_total_courses', 0)

    inst_change = new_institutions - old_institutions
    course_change = new_courses - old_courses
    inst_sign = '+' if inst_change >= 0 else ''
    course_sign = '+' if course_change >= 0 else ''

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRICOS Data Update Report</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }}

        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }}

        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}

        .header h1 {{
            font-size: 32px;
            margin-bottom: 10px;
        }}

        .header p {{
            font-size: 14px;
            opacity: 0.9;
        }}

        .content {{
            padding: 40px;
        }}

        .section {{
            margin-bottom: 40px;
        }}

        .section-title {{
            font-size: 20px;
            font-weight: 700;
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #667eea;
        }}

        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}

        .stat-card {{
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }}

        .stat-label {{
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 8px;
        }}

        .stat-value {{
            font-size: 28px;
            font-weight: 700;
            color: #333;
        }}

        .stat-change {{
            font-size: 14px;
            margin-top: 8px;
        }}

        .stat-change.positive {{
            color: #28a745;
            font-weight: 600;
        }}

        .stat-change.negative {{
            color: #dc3545;
            font-weight: 600;
        }}

        .change-list {{
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }}

        .change-item {{
            padding: 12px;
            margin-bottom: 8px;
            background: white;
            border-left: 3px solid #667eea;
            border-radius: 4px;
            font-size: 13px;
        }}

        .change-item.added {{
            border-left-color: #28a745;
        }}

        .change-item.removed {{
            border-left-color: #dc3545;
        }}

        .change-item.modified {{
            border-left-color: #ffc107;
        }}

        .change-item:last-child {{
            margin-bottom: 0;
        }}

        .change-title {{
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
        }}

        .change-detail {{
            color: #666;
            font-size: 12px;
        }}

        .empty-message {{
            text-align: center;
            color: #999;
            padding: 20px;
            font-style: italic;
        }}

        .footer {{
            background: #f8f9fa;
            padding: 20px 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #ddd;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }}

        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
            font-size: 13px;
        }}

        th {{
            background: #f8f9fa;
            font-weight: 600;
            color: #333;
        }}

        tr:hover {{
            background: #f8f9fa;
        }}

        .badge {{
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }}

        .badge.modified {{
            background: #fff3cd;
            color: #856404;
        }}

        @media print {{
            body {{
                background: white;
                padding: 0;
            }}
            .container {{
                box-shadow: none;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 CRICOS Data Update Report</h1>
            <p>Generated on {format_timestamp(timestamp)}</p>
        </div>

        <div class="content">
            <!-- Summary Statistics -->
            <div class="section">
                <h2 class="section-title">Summary</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Institutions</div>
                        <div class="stat-value">{new_institutions}</div>
                        <div class="stat-change {'positive' if inst_change >= 0 else 'negative'}">
                            {inst_sign}{inst_change} from {old_institutions}
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Total Courses</div>
                        <div class="stat-value">{new_courses:,}</div>
                        <div class="stat-change {'positive' if course_change >= 0 else 'negative'}">
                            {course_sign}{course_change} from {old_courses:,}
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">New Courses Added</div>
                        <div class="stat-value">{len(added_courses)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Courses Modified</div>
                        <div class="stat-value">{len(modified_courses)}</div>
                    </div>
                </div>
            </div>

            <!-- Added Institutions -->
            {f'''<div class="section">
                <h2 class="section-title">🆕 Added Institutions ({len(added_institutions)})</h2>
                <div class="change-list">
                    {render_added_institutions(added_institutions)}
                </div>
            </div>''' if added_institutions else ''}

            <!-- Removed Institutions -->
            {f'''<div class="section">
                <h2 class="section-title">❌ Removed Institutions ({len(removed_institutions)})</h2>
                <div class="change-list">
                    {f"".join(f'<div class="change-item removed"><div class="change-title">{inst}</div></div>' for inst in removed_institutions) if removed_institutions else '<div class="empty-message">No institutions removed</div>'}
                </div>
            </div>''' if removed_institutions else ''}

            <!-- Added Courses -->
            {f'''<div class="section">
                <h2 class="section-title">🆕 New Courses ({len(added_courses)})</h2>
                <div class="change-list">
                    {render_added_courses(added_courses)}
                </div>
            </div>''' if added_courses else ''}

            <!-- Removed Courses -->
            {f'''<div class="section">
                <h2 class="section-title">❌ Removed Courses ({len(removed_courses)})</h2>
                <div class="change-list">
                    {f"".join(f'<div class="change-item removed"><div class="change-title">{c.get("course", "N/A")}</div><div class="change-detail">{c.get("institution", "N/A")}</div></div>' for c in removed_courses) if removed_courses else '<div class="empty-message">No courses removed</div>'}
                </div>
            </div>''' if removed_courses else ''}

            <!-- Modified Courses -->
            {f'''<div class="section">
                <h2 class="section-title">✏️ Modified Courses ({len(modified_courses)})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Course</th>
                            <th>Institution</th>
                            <th>Changes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {render_modified_courses(modified_courses)}
                    </tbody>
                </table>
            </div>''' if modified_courses else ''}
        </div>

        <div class="footer">
            <p>Report generated on {format_timestamp(timestamp)}</p>
            <p>EDVISE Course Finder - CRICOS Data Management System</p>
        </div>
    </div>
</body>
</html>
"""

    return html

def main():
    print("=" * 70)
    print("GENERATING HTML CHANGE REPORTS")
    print("=" * 70)

    # Load latest report
    result = load_latest_report()
    if not result:
        print("❌ No reports found")
        return False

    report, filename = result
    timestamp = report.get('timestamp', '')

    # Generate HTML
    print(f"\n[1/2] Generating HTML report...")
    html_content = generate_html_report(report, filename)

    # Save HTML
    html_filename = filename.replace('.json', '.html')
    html_path = f"{HTML_REPORT_DIR}/{html_filename}"

    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"✓ HTML report saved: {html_path}")

    # Generate report index
    print(f"\n[2/2] Updating report index...")
    all_reports = load_all_reports()

    report_items = ''
    if all_reports:
        for rep in all_reports:
            changes_count = len(rep['changes'].get('added_courses', [])) + len(rep['changes'].get('modified_courses', []))
            report_items += f'''
            <li class="report-item">
                <div class="report-info">
                    <h3>Update Report</h3>
                    <p>{format_timestamp(rep.get('timestamp', ''))}</p>
                </div>
                <div class="report-stats">
                    <div class="report-stat">
                        <div class="report-stat-label">Institutions</div>
                        <div class="report-stat-value">{rep['summary'].get('new_institutions', 0)}</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-label">Courses</div>
                        <div class="report-stat-value">{rep['summary'].get('new_total_courses', 0):,}</div>
                    </div>
                    <div class="report-stat">
                        <div class="report-stat-label">Changes</div>
                        <div class="report-stat-value">{changes_count}</div>
                    </div>
                </div>
                <a href="/data_reports/html/{rep['filename'].replace('.json', '.html')}" target="_blank" rel="noopener noreferrer" class="report-link">View Report →</a>
            </li>
            '''
    else:
        report_items = '<li class="empty">No reports available yet</li>'

    index_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRICOS Update Reports History</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }}

        .container {{
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }}

        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
        }}

        .header h1 {{
            font-size: 24px;
            margin-bottom: 5px;
        }}

        .content {{
            padding: 30px;
        }}

        .report-list {{
            list-style: none;
        }}

        .report-item {{
            padding: 15px;
            background: #f8f9fa;
            margin-bottom: 10px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .report-info h3 {{
            margin-bottom: 5px;
            color: #333;
        }}

        .report-info p {{
            font-size: 12px;
            color: #666;
        }}

        .report-stats {{
            display: flex;
            gap: 20px;
            font-size: 12px;
        }}

        .report-stat {{
            text-align: center;
        }}

        .report-stat-label {{
            color: #999;
            font-size: 10px;
            text-transform: uppercase;
        }}

        .report-stat-value {{
            font-weight: 700;
            color: #333;
            font-size: 14px;
        }}

        .report-link {{
            display: inline-block;
            padding: 8px 16px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
        }}

        .report-link:hover {{
            background: #764ba2;
        }}

        .empty {{
            text-align: center;
            color: #999;
            padding: 40px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 CRICOS Update Reports History</h1>
            <p>All data update reports and changes</p>
        </div>

        <div class="content">
            <ul class="report-list">
                {report_items}
            </ul>
        </div>
    </div>
</body>
</html>
"""

    with open(f"{HTML_REPORT_DIR}/index.html", 'w', encoding='utf-8') as f:
        f.write(index_html)

    print(f"✓ Report index saved: {HTML_REPORT_DIR}/index.html")

    print("\n" + "=" * 70)
    print("✅ HTML REPORTS GENERATED SUCCESSFULLY!")
    print("=" * 70)
    print(f"\nView reports:")
    print(f"  📄 Latest: {html_path}")
    print(f"  📋 History: {HTML_REPORT_DIR}/index.html")
    print(f"\nOpen in browser to view!")

    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
