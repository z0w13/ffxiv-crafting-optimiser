.PHONY: browsersync
browsersync:
	npx browser-sync start --server app --files app/**

.PHONY: webserver
webserver:
	npm run start

.PHONY: watch
watch:
	npx sass --watch app/scss/main.scss app/css/main.css

.PHONY: build
build:
	npx sass app/scss/main.scss app/css/main.css

.PHONY: recipes
recipes:
	cd scripts/recipe-extractor && pdm run python3 main_scraper.py
	cp -rvf scripts/recipe-extractor/out/*.json app/data/recipedb
