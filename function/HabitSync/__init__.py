import json
import logging
import os
from datetime import datetime

import azure.functions as func
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError


def _get_blob_client(year: int):
    """
    Build and return a BlobClient for the given year.
    Uses env vars:
      - AzureWebJobsStorage: connection string
      - HABIT_CONTAINER_NAME: blob container name
      - HABIT_BLOB_PREFIX: blob filename prefix
    """
    connection_string = os.environ.get("AzureWebJobsStorage")
    if not connection_string:
        raise RuntimeError("AzureWebJobsStorage is not configured")

    container_name = os.environ.get("HABIT_CONTAINER_NAME", "habit-heatmap-backups")
    blob_prefix = os.environ.get("HABIT_BLOB_PREFIX", "habit")

    blob_name = f"{blob_prefix}-{year}.json"

    service_client = BlobServiceClient.from_connection_string(connection_string)
    container_client = service_client.get_container_client(container_name)

    # Create the container if it does not exist
    try:
        container_client.create_container()
        logging.info("Created container %s", container_name)
    except Exception:
        # If it already exists, that's fine
        pass

    return container_client.get_blob_client(blob_name)


def _parse_year_from_request(req: func.HttpRequest) -> int:
    """
    Try to parse ?year=YYYY from query string.
    If missing or invalid, default to current year.
    """
    year_str = req.params.get("year")
    if year_str is None:
        return datetime.utcnow().year

    try:
        year = int(year_str)
        if year < 2000 or year > 2100:
            raise ValueError("Year out of expected range")
        return year
    except ValueError:
        logging.warning("Invalid year query parameter: %s", year_str)
        return datetime.utcnow().year


def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("HabitSync function processed a %s request", req.method)

    method = req.method.upper()

    if method == "POST":
        return _handle_post(req)
    elif method == "GET":
        return _handle_get(req)
    else:
        return func.HttpResponse(
            json.dumps({"error": "Method not allowed"}),
            status_code=405,
            mimetype="application/json",
        )


def _handle_post(req: func.HttpRequest) -> func.HttpResponse:
    """
    Handle POST:
      - expects JSON body with: { "year": number, "data": { "YYYY-MM-DD": bool }, "timestamp": string }
      - saves it to a blob named habit-<year>.json
    """
    try:
        body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON body"}),
            status_code=400,
            mimetype="application/json",
        )

    year = body.get("year")
    data = body.get("data")
    timestamp = body.get("timestamp") or datetime.utcnow().isoformat()

    if year is None or data is None:
        return func.HttpResponse(
            json.dumps({"error": "Missing 'year' or 'data' in request body"}),
            status_code=400,
            mimetype="application/json",
        )

    try:
        year = int(year)
    except (TypeError, ValueError):
        return func.HttpResponse(
            json.dumps({"error": "Year must be an integer"}),
            status_code=400,
            mimetype="application/json",
        )

    try:
        blob_client = _get_blob_client(year)

        payload = {
            "year": year,
            "data": data,
            "timestamp": timestamp,
        }

        blob_client.upload_blob(
            json.dumps(payload),
            overwrite=True,
        )

        logging.info("Saved habit data for year %s to blob %s", year, blob_client.blob_name)

        return func.HttpResponse(
            json.dumps({"message": "Backup saved", "year": year}),
            status_code=200,
            mimetype="application/json",
        )

    except Exception as exc:
        logging.exception("Error saving habit data to blob: %s", exc)
        return func.HttpResponse(
            json.dumps({"error": "Failed to save backup"}),
            status_code=500,
            mimetype="application/json",
        )


def _handle_get(req: func.HttpRequest) -> func.HttpResponse:
    """
    Handle GET:
      - reads ?year=YYYY (optional, defaults to current year)
      - returns JSON from blob, or an empty payload if not found
    """
    year = _parse_year_from_request(req)

    try:
        blob_client = _get_blob_client(year)

        try:
            download_stream = blob_client.download_blob()
            raw = download_stream.readall()
            payload = json.loads(raw)

            # Ensure payload has the expected shape
            if "data" not in payload:
                payload = {
                    "year": year,
                    "data": {},
                    "timestamp": None,
                }

            return func.HttpResponse(
                json.dumps(payload),
                status_code=200,
                mimetype="application/json",
            )

        except ResourceNotFoundError:
            logging.info("No backup found for year %s", year)
            empty_payload = {
                "year": year,
                "data": {},
                "timestamp": None,
                "message": "No backup found for this year",
            }
            return func.HttpResponse(
                json.dumps(empty_payload),
                status_code=200,
                mimetype="application/json",
            )

    except Exception as exc:
        logging.exception("Error reading habit data from blob: %s", exc)
        return func.HttpResponse(
            json.dumps({"error": "Failed to load backup"}),
            status_code=500,
            mimetype="application/json",
        )
