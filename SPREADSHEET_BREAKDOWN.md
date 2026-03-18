# Capacity Planner - Full Spreadsheet Breakdown

## Overview

**File:** `Capacity Planner - New.xlsx`
**Purpose:** Tracks IT team resource usage (capacity/utilisation) across years, with year-over-year comparison and forecasting.

The workbook contains **5 sheets:**
1. **Summary** - Dashboard consolidating all years side-by-side
2. **2024** - Daily staff allocation data for 2024
3. **2025** - Daily staff allocation data for 2025
4. **2026** - Daily staff allocation data for 2026
5. **Forecast** - Forward-looking projection based on 2025 data

---

## Sheet 1: Summary

**Dimensions:** A1:AE111 (31 columns x 111 rows)

The Summary sheet is the main dashboard. It contains three year-over-year comparison blocks and a ticket tracking section.

### Section 1: Year 2026 Capacity (Rows 6-16)

A heatmap-style table showing monthly team utilisation as a decimal (0.0 - 1.0+).

| Row | Team | Data Source | Jan | Feb | ... | Dec | Avg Formula |
|-----|------|-------------|-----|-----|-----|-----|-------------|
| 7 | MGMT | `='2026'!D52:O52` (Array) | 0.565 | 0.667 | ... | 1.0 | `=AVERAGE(_xlfn.ANCHORARRAY(D7))` |
| 8 | Service Desk | `='2026'!D47:O47` (Array) | 0.881 | 0.833 | ... | 1.0 | `=AVERAGE(D8:O8)` |
| 9 | OST | `='2026'!D50:O50` (Array) | 0.725 | 0.952 | ... | 1.0 | `=AVERAGE(D9:O9)` |
| 10 | OST BaB | `='2026'!D51:O51` (Array) | 0.725 | 0.778 | ... | 1.0 | `=AVERAGE(D10:O10)` |
| 11 | Projects | `='2026'!D52:O52` (Array) | 0.565 | 0.667 | ... | 1.0 | `=AVERAGE(D11:O11)` |

**Quarterly Averages (Row 14):**
- Q1: `=AVERAGE(D7:F11)`
- Q2: `=AVERAGE(G7:I11)`
- Q3: `=AVERAGE(J7:L11)`
- Q4: `=AVERAGE(M7:O11)`

**Overall Average (P12):** `=AVERAGE(P7:P11)` (average of all team averages)

**Capacity Legend (Rows 15-16):**
- **Within Capacity** = 90%-110%
- **Under Resourced** = <90%
- **Over Resourced** = >110%

**Notes:** `PM Vacancy - 1x Support Engineer Feb`

### Section 2: Ticket Tracking (Columns R-AE)

Located to the right of the capacity heatmap, tracking service desk ticket volumes.

| Row | Label | Monthly Values (S-AD) | Total Formula |
|-----|-------|----------------------|---------------|
| 8 | Capacity (Full Team) | 2500 (Jan), 2300 (Feb-Dec) | `=SUM(S8:AD8)` |
| 9 | Opened | 1664, 1520, ... | `=SUM(S9:AD9)` |
| 10 | Closed | 1634, 1530, ... | `=SUM(S10:AD10)` |

**Note (S11):** "JM Left" with note "1x Support Engineer Vacancy"

### Section 3: Year 2025 Capacity (Rows 37-47)

Same structure as 2026, referencing the 2025 sheet.

| Row | Team | Data Source | Avg Formula |
|-----|------|-------------|-------------|
| 38 | Service Desk | `='2025'!E45:P45` (Array) | `=AVERAGE(_xlfn.ANCHORARRAY(D38))` |
| 39 | OST | `='2025'!E47:P50` (Array, spans rows 39-42) | `=AVERAGE(D39:O39)` |
| 40 | OST BaB | (part of row 39 array) | `=AVERAGE(D40:O40)` |
| 41 | Projects | (part of row 39 array) | `=AVERAGE(D41:O41)` |
| 42 | MGMT | (part of row 39 array) | `=AVERAGE(D42:O42)` |

**Quarterly Averages (Row 45):**
- Q1: `=AVERAGE(D38:F42)`
- Q2: `=AVERAGE(G38:I42)`
- Q3: `=AVERAGE(J38:L42)`
- Q4: `=AVERAGE(M38:O42)`

**2025 Ticket Tracking (Columns R-AE):**

| Row | Label | Sample Values | Total |
|-----|-------|---------------|-------|
| 39 | Capacity (Full Team) | 1312 (Jan-Mar), 2500 (Apr-Dec) | `=SUM(S39:AD39)` |
| 40 | Opened | 1075, 1040, 991, 1795, 2447, 3702, 3702, 2555, 2121, 2005, 2226, 1487 | `=SUM(S40:AD40)` |
| 41 | Closed | 910, 1040, 1000, 1773, 2620, 3687, 3678, 2451, 2235, 2068, 2183, 1548 | `=SUM(S41:AD41)` |

**Notes:**
- "Connectwise - Exc Alerts" (S42) / "*Moved to HALO" (V42)
- "Includes test tickets/duplicates" (V43)
- "*includes Alerts >" (V44)
- "Maternity Leave - Jan - Sept, SDM/OPs July - September - PM Vacancy - Oct >" (D46)

### Section 4: Year 2024 Capacity (Rows 67-77)

| Row | Team | Data Source | Avg Formula |
|-----|------|-------------|-------------|
| 68 | SD Available | Direct values (Jan-Apr), then `='2024'!$I$47` etc. for May-Dec | `=AVERAGE(D68:O68)` |
| 69 | OST | `='2024'!$E$49:$P$51` (Array, spans rows 69-71) | `=AVERAGE(D69:O69)` |
| 70 | OST BaB | (part of row 69 array) | `=AVERAGE(D70:O70)` |
| 71 | Projects | (part of row 69 array) | `=AVERAGE(D71:O71)` |
| 72 | MGMT | `='2024'!$E$52:$P$52` (Array) | `=AVERAGE(D72:O72)` |

**2024 Ticket Tracking:**

| Row | Label | Monthly Values | Total |
|-----|-------|----------------|-------|
| 69 | Capacity Current | 1312/month (all 12) | `=SUM(S69:AD69)` |
| 70 | Opened | 1587, 1370, 1400, 1256, 1008, 1211, 1107, 912, 1290, 1114, 1030, 698 | `=SUM(S70:AD70)` |
| 71 | Closed | 1076, 900, 1150, 1175, 1111, 1063, 1076, 925, 1270, 1117, 1010, 711 | `=SUM(S71:AD71)` |

**Notes:** "x1 Project Engineer Vacancy 1x 3rd Line Vacancy 1x OST" (D76)

### Section 5: Chart Reference Data (Rows 109-111)

Static reference lines for charts:
- Row 109: **Over Resourced** = 1.1 (repeated across 12 columns)
- Row 110: **Capacity** = 1.0 (repeated across 12 columns)
- Row 111: **Under Resourced** = 0.9 (repeated across 12 columns)

---

## Sheet 2: 2024

**Dimensions:** A1:QX54 (466 columns x 54 rows)

### Structure

- **Row 1:** Column headers - daily dates from 26/02/2024 through 31/12/2024
- **Columns A-C:** Staff Member | Normal Area of Work | Tier

### Staff Roster (2024)

| Row | Name | Area of Work | Tier |
|-----|------|-------------|------|
| | **Service Desk** | | |
| 3 | Sarah Watkins | Service Desk | 1st Line |
| 4 | Jacob Martin | Service Desk | 1st Line |
| 5 | Dan Carter | Service Desk | 2nd Line |
| 6 | Will Workman | Service Desk | 2nd Line |
| 7 | James Norman | Service Desk | 3rd Line |
| 8 | Luke Rothwell | Service Desk | 3rd Line |
| 9 | Ben Lockhart | Projects | Projects |
| 10 | Tom Harber | Service Desk | Service |
| | **OST BaB** | | |
| 12 | Eddie Beebee | Build-a-Bear | OST |
| 13 | Jake Vardy | Build-a-Bear | OST |
| 14 | Alex Walton | Build-a-Bear | OST |
| | **OST** | | |
| 16 | Udit Patel | OST | OST |
| 17 | Ray Chitekwe | OST | OST |
| | **Projects** | | |
| 19 | Nayan Kolhar | Projects | Projects |
| 20 | Sean Fenton | Projects | Projects |
| 21 | Andrew Lord | Projects | - |
| | **Team Leads** | | |
| 23 | Shane Visagie | MGMT | Service |
| 24 | Jack Mumford | MGMT | Service |
| 25 | Amber Baker | MGMT | Service |
| 26 | Alex Lawson | MGMT | MGMT |
| 27 | Amy Rawle | MGMT | - |
| 28 | Karl Smith | MGMT | MGMT |
| | **Vacancies** | | |
| 30 | Vacancy | Service Desk | - |

### Daily Activity Values

Each cell (D3:QX30) contains a text label for that person's activity on that day. Common values:
- `Normal Work` / `Service Desk` - Standard duties
- `Projects` / `PROJECTS` - Project work
- `Training` - Training/study
- `Annual Leave` / `Leave` / `A/L` - Time off
- `BH` - Bank Holiday
- `Sickness` / `Sick` / `Illness` - Sick leave
- `OST` / `OST Work` / `BAB OST` - On-site/Build-a-Bear work
- Various client/project names (e.g., `Yondr`, `Mitie`, `GHC Server Day`, `Ingenia on-site`)

### Calculation Rows

| Row | Label | Formula Pattern |
|-----|-------|----------------|
| 32 | Number of SD Team | Static value: 6 + daily fractions like `3/6`, `4/6` |
| 33 | Ticket Open | Raw ticket count values per day |
| 34 | Tickets Closed by SD | Raw values per day |
| 35 | Total Tickets Closed | Raw values per day |
| 36 | Deficit | `=D33-D35` (Opened minus Total Closed, per day) |

### Row 37: MGMT Utilisation (Daily)

Formula pattern: `=3/4`, `=4/4` etc. - fraction of MGMT team available each day (out of 4 team leads)

### Row 38: SD Utilisation (Daily)

Formula pattern: `=3/6`, `=4/6`, `=5/6` etc. - fraction of SD team on service desk duties (out of 6 members)

### Summary Calculations (Rows 44-52)

**Legend (Row 44-48):**
| Color | Meaning |
|-------|---------|
| Yellow | Normal Duties |
| Green | Training |
| Blue | Borrowed Resource |
| Dark Green | Annual Leave / Absent |

**Monthly Averages (Row 47 - Service Desk Availability):**
```
E47 (Jan): =AVERAGE(D38:U38,V38,Y38:AC38,AF38:AI38)
H47 (Apr): =AVERAGE(AN38:BP38)
I47 (May): =AVERAGE(BQ38:CU38)
J47 (Jun): =AVERAGE(CX38:DW38)
K47 (Jul): =AVERAGE(DZ38:EY38)
...and so on per month
```

**Monthly Averages (Row 49-52):**
| Row | Label | Sample Formula |
|-----|-------|---------------|
| 49 | OST | `=AVERAGE(D40:AL40)` per month range |
| 50 | OST BaB | `=AVERAGE(H40:AL40)` per month range |
| 51 | Projects | Similar AVERAGE of row 41 ranges |
| 52 | MGMT | Similar AVERAGE of row 37 ranges |

---

## Sheet 3: 2025

**Dimensions:** A1:ND54 (368 columns x 54 rows)

### Staff Roster (2025)

| Row | Name | Area of Work | Tier |
|-----|------|-------------|------|
| | **Service Desk** | | |
| 3 | Sarah Watkins | Service Desk | Support Engineer |
| 4 | Jacob Martin | Service Desk | Support Engineer |
| 5 | Dan Carter | Service Desk | Support Engineer |
| 6 | James Norman | Service Desk | Support Engineer |
| 7 | Tom Harber | Service Desk | Support Engineer |
| 8 | Luke Rothwell | Service Desk | Senior Support |
| 9 | James Mapes | Service Desk | Senior Support |
| 10 | Ben Lockhart | Service Desk | Senior Support |
| | **OST BaB** | | |
| 12 | Eddie Beebee | Build-a-Bear | OST |
| 13 | Alex Walton | Build-a-Bear | OST |
| | **OST** | | |
| 15 | Udit Patel | OST | OST |
| 16 | Ray Chitekwe | OST | OST |
| | **Projects** | | |
| 18 | Nayan Kolhar | Projects | Engineer |
| 19 | Sean Fenton | Projects | Engineer |
| 20 | Andrew Lord | Projects | Engineer |
| | **Team Leads** | | |
| 22 | Heide Stanley | MGMT | Service |
| 23 | Jack Mumford (Left June) | MGMT | Service |
| 24 | Amber Baker | MGMT | Service |
| 25 | Alex Lawson | MGMT | MGMT |
| 26 | Henry Portch | SE | - |
| 27 | Rebecca Smith | MGMT | - |
| 28 | Amy Rawle | MGMT | MGMT |
| | **Apprentice** | | |
| 29 | (Apprentice row) | | |

**Notable staff changes from 2024:**
- Will Workman removed (left)
- Shane Visagie removed
- Karl Smith removed
- Jake Vardy removed from OST BaB
- James Mapes added to Service Desk (Senior Support)
- Heide Stanley added (MGMT)
- Henry Portch added (SE)
- Rebecca Smith added (MGMT)
- Jack Mumford noted as "Left June"
- Tier labels changed: "1st/2nd/3rd Line" → "Support Engineer" / "Senior Support"

### Calculation Rows

| Row | Label | Formula |
|-----|-------|---------|
| 32 | Ticket Open | Raw values (e.g., 47, 37, 36, 43...) |
| 33 | Total Tickets Closed | Raw values (e.g., 33, 31, 45, 45...) |
| 34 | Deficit | `=D32-D33` (per day/week) |

### Utilisation Fractions (Rows 35-39)

| Row | Team | Sample Formula | Meaning |
|-----|------|---------------|---------|
| 35 | MGMT | `=1/4`, `=4/4` | Fraction of MGMT available (out of 4) |
| 36 | SD Utilisation | `=4/7`, `=5/7`, `=5/8` | SD staff on desk (denominator changes as team grows) |
| 37 | OST Utilisation | `=2/2`, `=4/2` | OST staff utilised (can exceed 1.0 = over-resourced) |
| 38 | OST BaB | `=1/2`, `=2/2` | BaB staff utilised |
| 39 | Projects Utilisation | `=2/3`, `=3/3` | Project staff utilised (out of 3) |

### Monthly Summary (Rows 44-51)

**Legend (Rows 42-48) with custom function `COUNTINGCOLOURS`:**
| Color | Meaning | Count Formula |
|-------|---------|---------------|
| Light Green | Normal Duties | `=COUNTINGCOLOURS(IM3:ND30, B43)` |
| Blue | Training | `=COUNTINGCOLOURS(IM4:ND31, B44)` |
| Rust | Booked Borrowed Resource | `=COUNTINGCOLOURS(IM5:ND32, B45)` |
| Grey | Annual Leave / Absent | `=COUNTINGCOLOURS(IM6:ND33, B46)` |
| Yellow | Provisionally Onsite | `=COUNTINGCOLOURS(IM7:ND34, B47)` |
| Dark Green | Booked Onsite | `=COUNTINGCOLOURS(IM8:ND35, B48)` |

> **Note:** `COUNTINGCOLOURS` is a **custom/add-in function** (not standard Excel). It counts cells by their background colour.

**Monthly Utilisation Averages:**

| Row | Team | Jan Formula | Feb Formula | ... | Total |
|-----|------|-------------|-------------|-----|-------|
| 45 | Service Desk | `=AVERAGE(D35:AH35)` | `=AVERAGE(AI36:BJ36)` | ... | `=AVERAGE(E45:P46)` |
| 47 | OST | `=AVERAGE(D37:AH37)` | `=AVERAGE(AI37:BJ37)` | ... | `=AVERAGE(E47:P47)` |
| 48 | OST BaB | `=AVERAGE(D38:AH38)` | `=AVERAGE(AI38:BJ38)` | ... | `=AVERAGE(E48:P48)` |
| 49 | Projects | `=AVERAGE(D39:AH39)` | `=AVERAGE(AI39:BJ39)` | ... | `=AVERAGE(E49:P49)` |
| 50 | MGMT | `=AVERAGE(D36:AH36)` | `=AVERAGE(AI35:BJ35)` | ... | `=AVERAGE(E50:P50)` |
| 51 | Team Utilization | `=AVERAGE(E45:E50)` | `=AVERAGE(F45:F50)` | ... | `=AVERAGE(Q45:Q50)` |

---

## Sheet 4: 2026

**Dimensions:** A1:NC54 (367 columns x 54 rows)

### Staff Roster (2026)

| Row | Name | Area of Work | Tier |
|-----|------|-------------|------|
| | **Service Desk** | | |
| 3 | Sarah Watkins | Service Desk | Support Engineer |
| 4 | Jacob Martin | Service Desk | Support Engineer |
| 5 | Dan Carter | Service Desk | Support Engineer |
| 6 | James Norman | Service Desk | Support Engineer |
| 7 | Tom Harber | Service Desk | Support Engineer |
| 8 | Luke Rothwell | Service Desk | Senior Support |
| 9 | James Mapes | Service Desk | Senior Support |
| 10 | Ben Lockhart | Service Desk | Senior Support |
| | **OST BaB** | | |
| 12 | Eddie Beebee | Build-a-Bear | OST |
| 13 | Alex Walton | Build-a-Bear | OST |
| | **OST** | | |
| 15 | Udit Patel | OST | OST |
| 16 | Ray Chitekwe | OST | OST |
| | **Projects** | | |
| 18 | Nayan Kolhar | Projects | Engineer |
| 19 | Sean Fenton | Projects | Engineer |
| 20 | Andrew Lord | Projects | Engineer |
| | **Team Leads** | | |
| 22 | Heide Stanley | MGMT | Service |
| 23 | Andrew Lord | SD TL | - |
| 24 | Jack Mumford (Left June) | MGMT | Service |
| 25 | Amber Baker | MGMT | Service |
| 26 | Alex Lawson | MGMT | MGMT |
| 27 | Henry Portch | SE | - |
| 28 | Rebecca Smith | MGMT | - |
| 29 | Amy Rawle | MGMT | MGMT |
| | **Apprentice** | | |
| 30 | (Apprentice row) | | |

**Notable changes from 2025:**
- Andrew Lord now also listed as "SD TL" (row 23) in Team Leads
- Jack Mumford still listed but marked as "Left June"

### Calculation Rows

| Row | Label | Values |
|-----|-------|--------|
| 33 | Ticket Open | 38, 70, 57, 57, 68, 49, 58, 52, 57, 60, 48 |
| 34 | Total Tickets Closed | 44, 69, 56, 65, 48, 56, 70, 42, 64, 63, 52 |
| 36 | Deficit | `=E33-E34` (per column) |

### Utilisation Fractions (Rows 37-41)

| Row | Team | Sample Formula | Note |
|-----|------|---------------|------|
| 37 | MGMT | `=2/5`, `=4/5`, `=3/5` | Out of 5 (team grew) |
| 38 | SD Utilisation | `=5/8`, `=7/8`, `=6/8` | Out of 8 |
| 39 | OST Utilisation | `=1.5/2`, `=1/2` | Out of 2 |
| 40 | OST BaB | `=1/2`, `=2/2` | Out of 2 |
| 41 | Projects Utilisation | `=2/3`, `=3/3` | Out of 3 |

### Monthly Summary (Rows 44-53)

**Legend with COUNTINGCOLOURS (Rows 44-50):**
Same colour-coding system as 2025 using the custom `COUNTINGCOLOURS` function.

**Monthly Utilisation Averages:**

| Row | Label | Jan Formula | Feb Formula | Total |
|-----|-------|-------------|-------------|-------|
| 47 | SD (Service Desk) | `=AVERAGE(D37:AG37)` | `=AVERAGE(AH38:BI38)` | `=AVERAGE(D47:O48)` |
| 49 | OST | `=AVERAGE(D39:AG39)` | `=AVERAGE(AH39:BI39)` | `=AVERAGE(D49:O49)` |
| 50 | OST BaB | `=AVERAGE(D40:AG40)` | `=AVERAGE(AH40:BI40)` | `=AVERAGE(D50:O50)` |
| 51 | Projects | `=AVERAGE(D41:AG41)` | `=AVERAGE(AH41:BI41)` | `=AVERAGE(D51:O51)` |
| 52 | MGMT | `=AVERAGE(D38:AG38)` | `=AVERAGE(AH37:BI37)` | `=AVERAGE(D52:O52)` |
| 53 | Team Utilization | `=AVERAGE(D47:D52)` | `=AVERAGE(E47:E52)` | `=AVERAGE(P47:P52)` |

---

## Sheet 5: Forecast

**Dimensions:** Small sheet, A3:H10

References the 2025 sheet to project remaining capacity.

| Cell | Label | Formula/Value |
|------|-------|---------------|
| G3 | Working days until 31/12/2025 | 1780 |
| H4 | Days remaining | `=SUM(H3-C10)` |
| C4 | Normal Duties count | `='2025'!C43` |
| C5 | Training count | `='2025'!C44` |
| C6 | Borrowed Resource count | `='2025'!C45` |
| C7 | Annual Leave / Absent count | `='2025'!C46` |
| C8 | Provisionally Onsite count | `='2025'!C47` |
| C9 | Booked Onsite count | `='2025'!C48` |
| C10 | Total non-normal days | `=SUM(C5:C9)` |

---

## Key Formula Patterns

### 1. Daily Utilisation Fractions
Each day, team utilisation is calculated as `=available/total`:
```
=5/8    (5 of 8 SD staff on desk)
=3/5    (3 of 5 MGMT available)
=2/3    (2 of 3 project engineers working)
```

### 2. Monthly Utilisation Averages
Each month's utilisation is the AVERAGE of the daily fractions for that month's date range:
```
=AVERAGE(D38:AG38)      (Jan - daily fractions across ~30 cols)
=AVERAGE(AH38:BI38)     (Feb - next ~28 cols)
```

### 3. Summary Sheet Array Formulas
The Summary sheet pulls monthly averages from year sheets using array formulas:
```
='2026'!D47:O47     (pulls Jan-Dec SD utilisation from 2026 sheet)
='2026'!D52:O52     (pulls Jan-Dec MGMT utilisation from 2026 sheet)
```

### 4. Ticket Deficit
```
=E33-E34    (Tickets Opened minus Tickets Closed = Deficit)
```

### 5. Quarterly Averages
```
=AVERAGE(D7:F11)    (Q1: average of Jan-Mar across all teams)
=AVERAGE(G7:I11)    (Q2: average of Apr-Jun across all teams)
```

### 6. Custom Function: COUNTINGCOLOURS
```
=COUNTINGCOLOURS(IM3:ND30, B43)
```
A non-standard Excel function (likely a VBA macro or add-in) that counts cells in a range based on their background colour matching the colour of the reference cell. Used to tally days by activity type (Normal, Training, Leave, etc.).

---

## Activity Types

The daily cells use text labels categorised broadly as:

| Category | Examples |
|----------|----------|
| **Standard Duties** | Normal Work, Service Desk, SD |
| **Project Work** | Projects, PROJECTS, VSOC, DWP, Argus, BaB [location], Radnor, etc. |
| **Training** | Training, Study, Revision, Cisco, MS Training, ITIL, PRINCE2 |
| **Leave** | Annual Leave, Leave, A/L, Half Day, Bank Hol, BH |
| **Absence** | Sickness, Sick Leave, Illness, Absent, Compassionate Leave, Maternity Leave |
| **On-site/Client** | 100+ unique client/site names (BaB Leeds, DWP Sheffield, Wessex, Hopson, etc.) |
| **Admin** | Admin, WFH, Office, Paperwork |
| **Special** | On-Call, Induction, Careers Fair, Van Repair, Left |

---

## Team Evolution (2024 → 2025 → 2026)

| Team | 2024 | 2025 | 2026 |
|------|------|------|------|
| Service Desk | 8 (6 SD + 2 flex) | 8 | 8 |
| OST BaB | 3 (Eddie, Jake, Alex) | 2 (Eddie, Alex) | 2 (Eddie, Alex) |
| OST | 2 (Udit, Ray) | 2 (Udit, Ray) | 2 (Udit, Ray) |
| Projects | 3 (Nayan, Sean, Andrew) | 3 (Nayan, Sean, Andrew) | 3 (Nayan, Sean, Andrew) |
| MGMT/Leads | 6 | 7 (+Heide, Henry, Rebecca; -Shane, Karl) | 8 (+Andrew Lord as SD TL) |
| **Total** | ~22 | ~22 | ~23 |

---

## Ticket System Migration

- **2024:** Connectwise (including alerts)
- **2025:** Moved to HALO (noted "Moved to HALO", "Connectwise - Exc Alerts")
- **2026:** HALO (continued)

Capacity baseline changed from 1312/month (2024 with smaller team) to 2300-2500/month (2025-2026 with larger team).
