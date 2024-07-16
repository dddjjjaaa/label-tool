# import os

from dotenv import load_dotenv
from flask import Flask, render_template, jsonify, request
import mysql.connector

# 加载环境变量
load_dotenv()

# 数据库连接信息

config = {
    'user': 'root',
    'password': '123456',
    'host': 'localhost',
    'database': 'djw',  # 替换为你的数据库名称
    'raise_on_warnings': True,
    'use_pure': True,
}


# 创建Flask应用
app = Flask(__name__)


# 从数据库加载分页图片和标签
def load_images_from_db(page, per_page):
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    offset = (page - 1) * per_page
    query = "SELECT PCH, HTTPURL, OTITLE, CLQK, WJBH FROM BMXT_CL ORDER BY PCH, PXH LIMIT %s OFFSET %s"
    cursor.execute(query, (per_page, offset))
    images = cursor.fetchall()
    cursor.execute("SELECT COUNT(*) FROM BMXT_CL WHERE PCH like 'test_2e3b5d8bf13247a5b5cc104d974f4b39' and CLQK != 6")
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM BMXT_CL WHERE PCH like 'test_2e3b5d8bf13247a5b5cc104d974f4b39' AND CLQK = 5")
    annotated_count = cursor.fetchone()[0]
    cursor.execute("SELECT MIN(HTTPURL) FROM BMXT_CL WHERE PCH like 'test_2e3b5d8bf13247a5b5cc104d974f4b39' AND CLQK != 5 and CLQK != 6")
    first_unannotated = cursor.fetchone()[0]
    cursor.close()
    conn.close()
    return [{'id': image[4], 'url': image[1], 'label': image[2].replace('\n', '') or '', 'clqk': image[3]} for image in
            images], total, annotated_count, first_unannotated


# 将标注信息保存到数据库
def save_annotation_to_db(url, label):
    conn = mysql.connector.connect(**config)
    cursor = conn.cursor()
    query = "UPDATE BMXT_CL SET OTITLE = %s, CLQK = 5 WHERE HTTPURL = %s"
    cursor.execute(query, (label, url))
    conn.commit()
    cursor.close()
    conn.close()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/images')
def get_images():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    images, total, annotated_count, first_unannotated = load_images_from_db(page, per_page)
    return jsonify(images=images, total=total, annotated_count=annotated_count, first_unannotated=first_unannotated)


@app.route('/annotate', methods=['POST'])
def annotate_image():
    data = request.json
    url = data['url']
    label = data['label']
    save_annotation_to_db(url, label)
    return jsonify(success=True)
