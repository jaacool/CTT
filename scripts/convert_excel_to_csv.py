#!/usr/bin/env python3
"""
Script to convert Han's work hours Excel file to CSV format for import
"""

import pandas as pd
import sys
from pathlib import Path

def convert_excel_to_csv(excel_path: str, output_path: str = None):
    """
    Convert Excel work hours to CSV format
    Expected Excel columns: Date, Start Time, End Time, Break, Project, Description
    """
    try:
        # Read Excel file
        df = pd.read_excel(excel_path)
        
        # Print column names to help identify the structure
        print("Excel columns found:")
        for i, col in enumerate(df.columns):
            print(f"  {i}: {col}")
        
        # Try to identify columns (adjust based on actual Excel structure)
        # Common German column names
        date_cols = ['Datum', 'Date', 'Tag']
        start_cols = ['Start', 'Von', 'Beginn', 'Start Time']
        end_cols = ['Ende', 'Bis', 'End Time']
        break_cols = ['Pause', 'Break', 'Pausenzeit']
        project_cols = ['Projekt', 'Project', 'Aufgabe']
        desc_cols = ['Beschreibung', 'Description', 'Notiz', 'Note']
        
        # Find matching columns
        date_col = next((col for col in df.columns if any(dc in str(col) for dc in date_cols)), None)
        start_col = next((col for col in df.columns if any(sc in str(col) for sc in start_cols)), None)
        end_col = next((col for col in df.columns if any(ec in str(col) for ec in end_cols)), None)
        break_col = next((col for col in df.columns if any(bc in str(col) for bc in break_cols)), None)
        project_col = next((col for col in df.columns if any(pc in str(col) for pc in project_cols)), None)
        desc_col = next((col for col in df.columns if any(dc in str(col) for dc in desc_cols)), None)
        
        print(f"\nMapped columns:")
        print(f"  Date: {date_col}")
        print(f"  Start: {start_col}")
        print(f"  End: {end_col}")
        print(f"  Break: {break_col}")
        print(f"  Project: {project_col}")
        print(f"  Description: {desc_col}")
        
        # Create output DataFrame
        output_data = []
        
        for _, row in df.iterrows():
            # Skip empty rows
            if pd.isna(row.get(date_col if date_col else df.columns[0])):
                continue
            
            entry = {
                'Datum': row.get(date_col, '') if date_col else '',
                'Start': row.get(start_col, '') if start_col else '',
                'Ende': row.get(end_col, '') if end_col else '',
                'Pause': row.get(break_col, 0) if break_col else 0,
                'Projekt': row.get(project_col, 'Arbeit') if project_col else 'Arbeit',
                'Beschreibung': row.get(desc_col, '') if desc_col else '',
            }
            
            # Format date if it's a datetime object
            if pd.notna(entry['Datum']) and hasattr(entry['Datum'], 'strftime'):
                entry['Datum'] = entry['Datum'].strftime('%d.%m.%Y')
            
            # Format times if they're datetime objects
            for time_field in ['Start', 'Ende']:
                if pd.notna(entry[time_field]) and hasattr(entry[time_field], 'strftime'):
                    entry[time_field] = entry[time_field].strftime('%H:%M')
            
            # Format break (convert to minutes if needed)
            if pd.notna(entry['Pause']):
                if hasattr(entry['Pause'], 'total_seconds'):
                    entry['Pause'] = int(entry['Pause'].total_seconds() / 60)
                elif isinstance(entry['Pause'], (int, float)):
                    entry['Pause'] = int(entry['Pause'])
            
            output_data.append(entry)
        
        # Create output DataFrame
        output_df = pd.DataFrame(output_data)
        
        # Determine output path
        if output_path is None:
            excel_file = Path(excel_path)
            output_path = excel_file.parent / f"{excel_file.stem}_converted.csv"
        
        # Save to CSV
        output_df.to_csv(output_path, index=False, encoding='utf-8')
        
        print(f"\n✅ Successfully converted {len(output_df)} entries")
        print(f"📁 Output saved to: {output_path}")
        print(f"\nFirst few entries:")
        print(output_df.head().to_string())
        
        return output_path
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert_excel_to_csv.py <excel_file> [output_csv]")
        print("\nExample:")
        print("  python convert_excel_to_csv.py /Users/aaron/Downloads/2025_HAN-LOEBS_ARBEITSZEITEN.xlsx")
        sys.exit(1)
    
    excel_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    convert_excel_to_csv(excel_file, output_file)
