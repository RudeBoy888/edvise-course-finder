#!/usr/bin/env python3
"""
Automatic CRICOS Data Update System
Monitors Excel file for changes, updates JSON, generates reports, and sends notifications
"""

import json
import subprocess
import hashlib
import shutil
from pathlib import Path
from datetime import datetime
import sys
import logging

# Configuration
EXCEL_FILE = 'cricos_data_current.xlsx'
DATA_DIR = Path('public')
COURSES_JSON = DATA_DIR / 'courses_data.json'
STATUS_FILE = Path('data_reports') / 'update_status.json'
PUBLIC_REPORTS_DIR = DATA_DIR / 'data_reports'
LOG_DIR = Path('data_reports') / 'logs'
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Setup logging
LOG_FILE = LOG_DIR / f"update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def get_file_hash(filepath):
    """Calculate SHA256 hash of file."""
    if not Path(filepath).exists():
        return None
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def load_status():
    """Load current update status."""
    if STATUS_FILE.exists():
        with open(STATUS_FILE, 'r') as f:
            return json.load(f)
    return {
        'last_update': None,
        'last_hash': None,
        'update_count': 0,
        'history': []
    }

def save_status(status):
    """Save update status."""
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATUS_FILE, 'w') as f:
        json.dump(status, f, indent=2)

def check_for_changes():
    """Check if Excel file has changed since last update."""
    if not Path(EXCEL_FILE).exists():
        logger.error(f"❌ Excel file not found: {EXCEL_FILE}")
        return False

    current_hash = get_file_hash(EXCEL_FILE)
    status = load_status()
    last_hash = status.get('last_hash')

    if last_hash is None:
        logger.info("📊 First run - no previous hash found")
        return True

    if current_hash == last_hash:
        logger.info("✓ No changes detected - data is up to date")
        return False

    logger.info(f"📝 Changes detected!")
    logger.info(f"  Old hash: {last_hash[:8]}...")
    logger.info(f"  New hash: {current_hash[:8]}...")
    return True

def run_conversion():
    """Run the Excel to JSON conversion."""
    logger.info("\n[1/3] Converting Excel to JSON...")
    try:
        result = subprocess.run(
            ['python3', 'convert_excel_to_json.py'],
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode == 0:
            logger.info("✓ Conversion completed successfully")
            logger.debug(result.stdout)
            return True
        else:
            logger.error(f"❌ Conversion failed:\n{result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        logger.error("❌ Conversion timeout (>5 minutes)")
        return False
    except Exception as e:
        logger.error(f"❌ Conversion error: {e}")
        return False

def run_report_generation():
    """Generate HTML reports."""
    logger.info("\n[2/3] Generating HTML reports...")
    try:
        result = subprocess.run(
            ['python3', 'generate_change_report_html.py'],
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode == 0:
            logger.info("✓ Report generation completed successfully")
            logger.debug(result.stdout)
            return True
        else:
            logger.error(f"❌ Report generation failed:\n{result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        logger.error("❌ Report generation timeout (>2 minutes)")
        return False
    except Exception as e:
        logger.error(f"❌ Report generation error: {e}")
        return False

def copy_reports_to_public():
    """Copy generated reports to public folder for web serving."""
    logger.info("\n📋 Copying reports to public folder...")
    try:
        # Remove old public reports
        if PUBLIC_REPORTS_DIR.exists():
            shutil.rmtree(PUBLIC_REPORTS_DIR)

        # Copy new reports
        shutil.copytree(Path('data_reports'), PUBLIC_REPORTS_DIR)
        logger.info(f"✓ Reports copied to {PUBLIC_REPORTS_DIR}")
        return True
    except Exception as e:
        logger.error(f"⚠️  Warning: Could not copy reports to public folder: {e}")
        return False  # Non-fatal error

def update_status(success=True):
    """Update status file with latest update info."""
    status = load_status()

    if success:
        current_hash = get_file_hash(EXCEL_FILE)
        update_record = {
            'timestamp': datetime.now().isoformat(),
            'status': 'success',
            'hash': current_hash,
            'log_file': str(LOG_FILE)
        }

        status['last_update'] = datetime.now().isoformat()
        status['last_hash'] = current_hash
        status['update_count'] = status.get('update_count', 0) + 1
        status['last_status'] = 'success'
    else:
        update_record = {
            'timestamp': datetime.now().isoformat(),
            'status': 'failed',
            'log_file': str(LOG_FILE)
        }
        status['last_status'] = 'failed'

    status['history'] = status.get('history', [])
    status['history'].insert(0, update_record)
    status['history'] = status['history'][:50]  # Keep last 50 updates

    save_status(status)
    return status

def send_notifications(status, success=True):
    """Send notifications about the update."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    if success:
        message = f"""
✅ CRICOS DATA UPDATE SUCCESSFUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timestamp: {timestamp}
Status: Data updated successfully
Update #: {status['update_count']}
Last Update: {status['last_update']}
Log File: {LOG_FILE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
View reports: localhost:5173/data_reports/html/index.html
"""
    else:
        message = f"""
❌ CRICOS DATA UPDATE FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Timestamp: {timestamp}
Status: Update failed - check logs
Log File: {LOG_FILE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

    logger.info(message)

    # Save notification to file (can be picked up by frontend)
    notification = {
        'timestamp': datetime.now().isoformat(),
        'type': 'success' if success else 'error',
        'message': message.strip(),
        'log_file': str(LOG_FILE)
    }

    notification_file = Path('data_reports') / 'latest_notification.json'
    with open(notification_file, 'w') as f:
        json.dump(notification, f, indent=2)

    logger.info(f"✓ Notification saved to {notification_file}")

def main():
    """Main update process."""
    logger.info("=" * 70)
    logger.info("🔄 AUTOMATIC CRICOS DATA UPDATE SYSTEM")
    logger.info("=" * 70)

    # Check for changes
    if not check_for_changes():
        logger.info("\n✓ No action needed")
        return True

    logger.info("\n🔄 Starting update process...")

    # Run conversion
    if not run_conversion():
        logger.error("\n❌ Update failed at conversion stage")
        status = update_status(success=False)
        send_notifications(status, success=False)
        return False

    # Generate reports
    if not run_report_generation():
        logger.error("\n❌ Update failed at report generation stage")
        status = update_status(success=False)
        send_notifications(status, success=False)
        return False

    # Copy reports to public folder
    copy_reports_to_public()

    # Update status and send notifications
    logger.info("\n[3/3] Finalizing update...")
    status = update_status(success=True)
    send_notifications(status, success=True)

    logger.info("\n" + "=" * 70)
    logger.info("✅ UPDATE COMPLETED SUCCESSFULLY!")
    logger.info("=" * 70)

    return True

if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except Exception as e:
        logger.error(f"\n💥 CRITICAL ERROR: {e}", exc_info=True)
        status = load_status()
        send_notifications(status, success=False)
        exit(1)
