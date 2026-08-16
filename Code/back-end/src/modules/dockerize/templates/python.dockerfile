FROM {{BASE_IMAGE}} AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt
COPY . .

FROM {{BASE_IMAGE}} AS runner
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY --from=builder /app ./
ENV PATH=/root/.local/bin:$PATH
EXPOSE {{PORT}}
CMD [{{RUN_COMMAND}}]