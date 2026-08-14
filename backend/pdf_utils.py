from pypdf import PdfReader


def extract_pdf_text(filepath: str):
    reader = PdfReader(filepath)

    text = ""

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text