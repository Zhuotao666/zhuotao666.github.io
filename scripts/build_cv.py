"""Build the two-page CV. Requires reportlab; accepts an output PDF path."""

import argparse
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


PROJECTS = [
    {
        "title": "Delivering in the Extremes: Bounded Autonomy and the Reorganization of Climate Risks in Platform Labor",
        "authors": "With Seona Park.",
        "funding": "Funded by the 2026 University Research Project of the Guangzhou Municipal Education Bureau",
    },
    {
        "title": "Policy Network Analysis and Coherence Mechanisms within Low-Carbon Policies toward a Just Transition",
        "authors": "With Seona Park, Jing Yu, and Ying Cao.",
        "funding": "Funded by the 2025 Research Fund for International Scientists, National Natural Science Foundation of China",
    },
    {
        "title": "Wind Power and the Politics of Emotion in China",
        "authors": "With JiHye Kim, Seona Park, and Ying Cao.",
    },
    {
        "title": "Offshore Wind-Fishery Coexistence and Community Acceptance: A Field Study of Nanri Island in Fujian Province",
        "authors": "With Seona PARK and Jing YU.",
        "url": "https://localbiodiversityoutlooks.net/community-observations-biodiversity-change-wind-turbine/",
    },
    {
        "title": "The Efficiency of Typhoon Forecasts: Evidence from China's Public Typhoon Alert System",
        "authors": "With Yuqi Song and Zijun Liu.",
        "url": "https://repository.hkust-gz.edu.cn/itemDetail?id=2082671707485696002",
    },
    {
        "title": "From Climate Cognition to Sustainable Employment: How Corporate Climate-Risk Attention Reshapes Labor Employment Structure",
        "authors": "With Yixiang Bai.",
    },
    {
        "title": 'Can Computing-Electricity Synergy Break the "Jevons Paradox"? An Empirical Study Based on Tripartite Evolutionary Game and Multi-Period DID',
        "authors": "With Yitao Zhang.",
    },
    {
        "title": "Integrated energy and carbon management in intensive pig farms: A Critical Review of Manure Methane Control, Renewable-Energy Integration, and Biogenic CO<sub>2</sub> Management",
        "authors": "With Changxiang He, Zihan Chen, Haoliang Zhang, Zhuotao Lu, Kejun Jiang.",
        "status": "(Submitted to a journal)",
    },
]


class CV:
    WIDTH, HEIGHT = 612, 792
    LEFT, RIGHT = 45, 567

    def __init__(self, path, font_dir):
        for name, filename in [("CV", "times.ttf"), ("CV-Bold", "timesbd.ttf"),
                               ("CV-Italic", "timesi.ttf"), ("CV-BoldItalic", "timesbi.ttf")]:
            pdfmetrics.registerFont(TTFont(name, str(font_dir / filename)))
        pdfmetrics.registerFontFamily("CV", normal="CV", bold="CV-Bold",
                                      italic="CV-Italic", boldItalic="CV-BoldItalic")
        self.canvas = canvas.Canvas(str(path), pagesize=(self.WIDTH, self.HEIGHT))
        self.canvas.setTitle("Zhuotao Lu - Curriculum Vitae")
        self.canvas.setAuthor("Zhuotao Lu")
        self.y = 47
        self.page = 1

    def paragraph(self, text, *, size=11, leading=13.5, indent=0, after=0, align=0):
        style = ParagraphStyle("cv", fontName="CV", fontSize=size, leading=leading,
                               alignment=align, textColor=colors.black)
        p = Paragraph(text, style)
        width = self.RIGHT - self.LEFT - indent
        _, height = p.wrap(width, self.HEIGHT)
        if self.y + height > 744:
            raise ValueError(f"Page {self.page} would overflow: {text[:80]}")
        p.drawOn(self.canvas, self.LEFT + indent, self.HEIGHT - self.y - height)
        self.y += height + after

    def row(self, left, right, *, size=10.8, after=0):
        right_width = pdfmetrics.stringWidth(right, "CV", size) + 10
        p = Paragraph(left, ParagraphStyle("row", fontName="CV", fontSize=size, leading=13.5))
        _, height = p.wrap(self.RIGHT - self.LEFT - right_width, self.HEIGHT)
        p.drawOn(self.canvas, self.LEFT, self.HEIGHT - self.y - height)
        self.canvas.setFont("CV", size)
        self.canvas.drawRightString(self.RIGHT, self.HEIGHT - self.y - size, right)
        self.y += height + after

    def section(self, title, *, before=10):
        self.y += before
        self.paragraph(title, size=13, leading=16)
        self.canvas.setLineWidth(0.45)
        self.canvas.line(self.LEFT, self.HEIGHT - self.y, self.RIGHT, self.HEIGHT - self.y)
        self.y += 7

    def bullet(self, text, *, after=5):
        self.canvas.setFont("CV", 10.5)
        self.canvas.drawString(self.LEFT + 2, self.HEIGHT - self.y - 10.5, "\u2022")
        self.paragraph(text, indent=13, after=after)

    def finish_page(self):
        self.canvas.setFont("CV", 10)
        self.canvas.drawCentredString(self.WIDTH / 2, 25, str(self.page))
        self.canvas.showPage()
        self.page += 1
        self.y = 47


def build(output, font_dir):
    output.parent.mkdir(parents=True, exist_ok=True)
    cv = CV(output, font_dir)
    cv.paragraph("<b>Zhuotao Lu</b>", size=20, leading=24, align=1, after=4)
    cv.paragraph("PhD Candidate in Carbon Neutrality and Climate Change", align=1)
    cv.paragraph("The Hong Kong University of Science and Technology (Guangzhou)", align=1, after=5)
    cv.paragraph('Email: <link href="mailto:zlu526@connect.hkust-gz.edu.cn">zlu526@connect.hkust-gz.edu.cn</link> &nbsp; | &nbsp; Tel: (+86) 130 7829 3713', align=1, size=10.5)
    cv.section("Education", before=11)
    cv.row("<b>The Hong Kong University of Science and Technology (Guangzhou)</b>", "Feb. 2025 - Present", size=10.5)
    cv.row("<i>PhD Candidate in Carbon Neutrality and Climate Change, Society Hub</i>", "GPA: 3.87 / 4.30", size=10.5, after=6)
    cv.row("<b>The Hong Kong Polytechnic University</b>", "Oct. 2024")
    cv.paragraph("<i>MSc in ESG and Sustainability (Finance-based), Faculty of Business</i>", size=10.5)
    cv.row("<i>With Distinction</i>", "GPA: 3.77 / 4.30", size=10.5, after=6)
    cv.row("<b>Guangdong University of Finance and Economics</b>", "Jul. 2022")
    cv.row("<i>BSc in Economics, International Economics and Trade</i>", "GPA: 87.3 / 100", size=10.5)
    cv.section("Ongoing Research Projects", before=11)
    for project in PROJECTS:
        title = "<b>" + project["title"] + "</b>"
        if project.get("status"):
            title += ' <font size="10.2"><i>' + project["status"] + "</i></font>"
        cv.bullet(title, after=1)
        authors = project["authors"]
        if project.get("url"):
            authors += ' &nbsp; <link href="' + project["url"] + '" color="#194B85"><u>Link</u></link>'
        cv.paragraph(authors, indent=13, size=10.5, leading=13)
        if project.get("funding"):
            cv.paragraph("<i>" + project["funding"] + ".</i>", indent=13, size=10, leading=12)
        cv.y += 7
    print(f"Research ends at {cv.y:.1f}pt on page 1")
    cv.finish_page()

    cv.section("Internship Experience", before=0)
    cv.row("<b>PAL Advisory Limited</b>", "Hong Kong")
    cv.row("<i>ESG Disclosure Intern</i>", "Feb. 2024 - Apr. 2024", after=7)
    cv.bullet("Compared sustainability disclosure frameworks and listing guidelines across major exchanges and jurisdictions.")
    cv.bullet("Assisted companies from Mainland China, Hong Kong, and Singapore in preparing ESG and sustainability reports for HKEX and SGX.")
    cv.bullet("Applied regional accounting rules and emission factors to calculate corporate carbon emissions for environmental disclosures.", after=10)
    cv.row("<b>Beijing Dayi Consulting Management Co., Ltd.</b>", "Beijing")
    cv.row("<i>Research Assistant</i>", "Apr. 2023 - Aug. 2023", after=7)
    cv.bullet("Participated in research on photovoltaic power generation and industrial chains under the carbon neutrality transition.")
    cv.bullet("Reviewed renewable energy development, financing mechanisms, and policy landscapes, and synthesized findings into research reports.", after=10)
    cv.row("<b>Guangdong Foreign Economic and Trade Enterprises Association</b>", "Guangzhou")
    cv.row("<i>Intern Assistant</i>", "Feb. 2022 - May 2022", after=7)
    cv.bullet("Participated in third-party evaluation of Guangdong online trade exhibition projects.")
    cv.bullet("Collected questionnaire data and prepared evaluation reports supporting government trade policy design.", after=0)

    cv.section("Honors &amp; Prizes", before=12)
    for date, award in [
        ("2024.05", "Top Research Project Winner, ESG and Sustainability Capstone Project"),
        ("2022.06", "Excellent Undergraduate Thesis Award"),
        ("2022.06", "Outstanding Graduate Award"),
        ("2021.12", "National Scholarship"),
        ("2021.11", "President Scholarship Nomination Award"),
        ("2021.10", "Dean Scholarship; Academic Research Scholarship"),
        ("2020.10", "Academic Excellence Scholarship"),
    ]:
        cv.paragraph(date + " &nbsp; &nbsp; " + award, after=1)
    cv.section("Languages &amp; Technical Skills", before=12)
    cv.paragraph("<b>Languages:</b> Mandarin (Native), Cantonese (Native), English (Fluent)", after=5)
    cv.paragraph("<b>Technical Skills:</b> Stata, R, GIS, MS Office")
    cv.section("Research Interests", before=12)
    cv.paragraph("Climate change economics, climate and energy policy, policy evaluation, climate risk, climate justice, ESG disclosure and rating, climate resilience and climate adaptation of cities and communities.")
    print(f"Content ends at {cv.y:.1f}pt on page 2")
    cv.finish_page()
    cv.canvas.save()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--font-dir", type=Path, default=Path("C:/Windows/Fonts"))
    args = parser.parse_args()
    build(args.output, args.font_dir)
