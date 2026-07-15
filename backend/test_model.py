from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch, json

model_dir = 'model/bertweet_sentiment'
tokenizer = AutoTokenizer.from_pretrained(model_dir, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(model_dir, local_files_only=True)
model.eval()

with open(model_dir + '/label_info.json') as f:
    info = json.load(f)

texts = [
    'worst product ever!! total waste of money!!',
    'I hate this so much, absolutely terrible!!',
    'This ruined my day completely',
    'I love this product!',
    'I received my package today'
]

for text in texts:
    inputs = tokenizer(text, return_tensors='pt', max_length=128, truncation=True, padding='max_length')
    with torch.no_grad():
        outputs = model(**inputs)
        proba = torch.softmax(outputs.logits, dim=1)[0].numpy()
    label = info['id2label'][str(int(proba.argmax()))]
    print(f'{label} ({proba.max():.2f}) | {text}')
