# Contributing

Bug reports and feature requests are welcome in GitHub Issues. Please include your Home Assistant version, card version and a minimal reproduction without secrets. Keep changes focused and maintain the existing visual editor, Grid behavior and RSS security checks.

To run regression tests:

```bash
python -m pip install pytest defusedxml
python -m pytest -q tests/test_feed.py
node --check custom_components/news_ticker/frontend/news-ticker-card.js
```

The project is maintained as a community beta. Please open a pull request for code changes instead of pushing directly to the main branch.
