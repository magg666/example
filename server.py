from flask import Flask, render_template, request

app = Flask(__name__)


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/sw.js', methods=['GET'])
def sw():
    return app.send_static_file('sw.js')


app.run(debug=True)
