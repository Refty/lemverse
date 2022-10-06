FROM python:3.8-alpine

WORKDIR /app

COPY . /app

RUN pip3 install djlint==1.18.0

CMD ["./scripts/djlint.sh && ./script/editorconfig.sh && ./scripts/eslint.sh && ./scripts/stylelint.sh"]
