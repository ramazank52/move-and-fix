from __future__ import annotations

import csv
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "exports" / "us-ca-la-checkpoint-a-audit"
EXPORTS = ROOT / "exports"


def write_sheet(workbook: Workbook, title: str, headers: list[str], rows: list[list[object]]) -> None:
    sheet = workbook.create_sheet(title)
    sheet.append(headers)
    header_fill = PatternFill("solid", fgColor="17365D")
    for cell in sheet[1]:
        cell.font = Font(color="FFFFFF", bold=True)
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for row in rows:
        sheet.append(row)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for column_index, header in enumerate(headers, start=1):
        max_length = max([len(str(header))] + [len(str(row[column_index - 1] if column_index - 1 < len(row) else "")) for row in rows])
        sheet.column_dimensions[get_column_letter(column_index)].width = min(max(max_length + 2, 14), 48)
    for row in sheet.iter_rows(min_row=2):
        for cell in row:
            cell.alignment = Alignment(vertical="top", wrap_text=True)


def main() -> None:
    matrix_path = AUDIT / "US_CA_LA_SERVICE_CREDENTIAL_MATRIX.csv"
    sources_path = AUDIT / "US_CA_LA_SOURCE_REGISTER.csv"
    bundle_path = AUDIT / "US_CA_LA_REQUIREMENT_BUNDLE_MANIFEST.json"
    connector_path = AUDIT / "US_CA_LA_CONNECTOR_INVENTORY.json"
    locale_path = AUDIT / "US_CA_LA_LOCALE_REGISTER.json"

    with matrix_path.open(newline="", encoding="utf-8") as matrix_file:
        matrix_reader = csv.DictReader(matrix_file)
        matrix_rows = list(matrix_reader)
        matrix_headers = matrix_reader.fieldnames or []
    with sources_path.open(newline="", encoding="utf-8") as sources_file:
        source_reader = csv.DictReader(sources_file)
        source_rows = list(source_reader)
        source_headers = source_reader.fieldnames or []
    bundles = json.loads(bundle_path.read_text(encoding="utf-8"))
    connectors = json.loads(connector_path.read_text(encoding="utf-8"))
    locales = json.loads(locale_path.read_text(encoding="utf-8"))

    matrix_book = Workbook()
    matrix_book.remove(matrix_book.active)
    write_sheet(matrix_book, "62 Coverage Matrix", matrix_headers, [[row.get(header, "") for header in matrix_headers] for row in matrix_rows])
    bundle_headers = ["bundleKey", "title", "riskLevel", "triggerDescription", "verificationDescription", "requiredEvidenceJson", "subjectBindings", "sourceBindings", "boundCoverageRows", "decisionIfMissing", "sourceState", "legalState", "orphan", "ambiguousAlias"]
    bundle_rows = [[
        bundle.get("bundleKey", ""), bundle.get("title", ""), bundle.get("riskLevel", ""), bundle.get("triggerDescription", ""),
        bundle.get("verificationDescription", ""), json.dumps(bundle.get("requiredEvidenceJson", []), ensure_ascii=False),
        json.dumps(bundle.get("subjectBindings", []), ensure_ascii=False), json.dumps(bundle.get("sourceBindings", []), ensure_ascii=False),
        json.dumps(bundle.get("boundCoverageRows", []), ensure_ascii=False), bundle.get("decisionIfMissing", ""), bundle.get("sourceState", ""),
        bundle.get("legalState", ""), bundle.get("orphan", ""), bundle.get("ambiguousAlias", ""),
    ] for bundle in bundles]
    write_sheet(matrix_book, "26 Requirement Bundles", bundle_headers, bundle_rows)
    connector_headers = ["connectorKey", "displayName", "officialSourceKey", "targetRegistryOrApi", "status", "assuranceLevel", "forbiddenScraping", "accessPermissionRequirement", "returnedFields", "expirySuspensionRevocationCheck", "noGoReason"]
    write_sheet(matrix_book, "28 Connector Inventory", connector_headers, [[connector.get(header, "") for header in connector_headers] for connector in connectors])
    locale_headers = ["document_key", "document_version", "document_surface", "legal_approval_state", "locale", "localization_state", "content_hash", "content_storage_key", "runtime_selectable"]
    write_sheet(matrix_book, "12 Draft Machine Locales", locale_headers, [[
        locale.get("documentKey", ""), locale.get("documentVersion", ""), locale.get("documentSurface", ""), locale.get("legalApprovalState", ""),
        locale.get("locale", ""), locale.get("localizationState", ""), locale.get("contentHash", ""), locale.get("contentStorageKey", ""), locale.get("runtimeSelectable", ""),
    ] for locale in locales])
    matrix_book.save(EXPORTS / "US_CA_LA_SERVICE_CREDENTIAL_MATRIX.xlsx")

    source_book = Workbook()
    source_book.remove(source_book.active)
    write_sheet(source_book, "28 Source Register", source_headers, [[row.get(header, "") for header in source_headers] for row in source_rows])
    source_book.save(EXPORTS / "US_CA_LA_SOURCE_REGISTER.xlsx")


if __name__ == "__main__":
    main()
