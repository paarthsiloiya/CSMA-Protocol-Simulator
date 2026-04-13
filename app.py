from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('csma.html', active_protocol='csma')

@app.route('/csma')
def csma():
    return render_template('csma.html', active_protocol='csma')

@app.route('/csma-cd')
def csmacd():
    return render_template('csmacd.html', active_protocol='csmacd')

@app.route('/csma-ca')
def csmaca():
    return render_template('csmaca.html', active_protocol='csmaca')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
