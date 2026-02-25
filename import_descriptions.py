#!/usr/bin/env python3
"""
Import descriptions from CSV back into Excel
"""

import openpyxl
from pathlib import Path
import csv

def import_descriptions_from_csv():
    """Read CSV and update Excel with descriptions"""
    excel_path = Path("/Users/rudybobek/Downloads/cricos-providers-courses-and-locations-as-at-2026-1-2-9-26-52.xlsx")
    csv_path = Path("/Users/rudybobek/edvise-course-finder/courses_to_add_descriptions.csv")

    if not csv_path.exists():
        print(f"❌ CSV file not found: {csv_path}")
        print("   First run: python3 add_descriptions_helper.py")
        return

    if not excel_path.exists():
        print(f"❌ Excel not found: {excel_path}")
        return

    try:
        # Load Excel
        print("📖 Loading Excel...")
        wb = openpyxl.load_workbook(excel_path)
        ws_courses = wb['Courses']

        # Read CSV
        print("📖 Reading CSV...")
        added_count = 0
        skipped_count = 0

        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)

            for row in reader:
                try:
                    row_num = int(row['Row'])
                    description = row.get('Description', '').strip()

                    # Skip empty descriptions
                    if not description or description == "[PASTE DESCRIPTION HERE]":
                        skipped_count += 1
                        continue

                    # Update Excel
                    ws_courses.cell(row=row_num, column=25).value = description
                    added_count += 1

                    print(f"✅ Row {row_num}: Description added ({len(description)} chars)")

                except Exception as e:
                    print(f"❌ Error processing row: {e}")
                    continue

        # Save Excel
        print(f"\n💾 Saving Excel...")
        wb.save(excel_path)

        print("\n" + "=" * 70)
        print(f"\n✅ IMPORT COMPLETE:\n")
        print(f"   Added: {added_count} descriptions")
        print(f"   Skipped: {skipped_count} (empty)")
        print(f"\n📝 Saved to: {excel_path}")

        # Next step
        print("\n" + "=" * 70)
        print(f"\n🔄 NEXT STEP:\n")
        print(f"   Run: python3 convert_excel_to_json.py")
        print(f"   Then refresh app (http://localhost:5173)\n")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import_descriptions_from_csv()
