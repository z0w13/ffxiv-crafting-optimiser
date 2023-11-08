.PHONY: all
all: build recipes buffs gh-pages clean

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

.PHONY: buffs
buffs:
	cd scripts/recipe-extractor && pdm run python3 buff_scraper.py
	cp -vf scripts/recipe-extractor/{Meal,Medicine}.json app/data/buffs

.PHONY: gh-pages
gh-pages:
	mkdir -p _build
	rm -rf _build/.git
	cp -r .git _build/
	cd _build && git fetch --all
	cd _build && git checkout -f gh-pages
	cp -r app/* _build/
	cp index.html _build/index.html
	cd _build && git add .
	cd _build && git commit -m "Updated files"
	cd _build && git push origin gh-pages

.PHONY: clean
clean:
	rm -rf scripts/recipe-extractor/out scripts/recipe-extractor/{Meal,Medicine}.json
	rm -rf _build
