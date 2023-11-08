import requests
import json
import time
from operator import itemgetter
from tqdm import tqdm  # funny progress bar :)

MAX_REQ_PER_SEC = 20
REQ_DELAY = 1 / MAX_REQ_PER_SEC

# {
#     "control_percent": 10,
#     "control_value": 99,
#     "craftsmanship_percent": 4,
#     "craftsmanship_value": 42,
#     "hq": false,
#     "id": "7b9dfabf229",
#     "name": {
#       "de": "Kriegereintopf",
#       "en": "Warrior's Stew",
#       "fr": "Nogootoj shol",
#       "ja": "ゼラスープ"
#     }
# }


def item_to_buff(item, hq=False) -> dict:
    buff_info = {
        "id": item["ID"],
        "hq": hq,
        "name": {
            "de": item["Name_de"],
            "en": item["Name_en"],
            "fr": item["Name_fr"],
            "ja": item["Name_ja"],
        },
    }

    for bonus in {"Control", "Craftsmanship", "CP"}:
        if not bonus in item["Bonuses"]:
            continue

        bonus_data = item["Bonuses"][bonus]
        if not bonus_data["Relative"]:
            print(f"Bonuses for {item} aren't relative: ", item)
            raise Exception("See Above")

        buff_info[bonus.lower() + "_percent"] = bonus_data["ValueHQ" if hq else "Value"]
        buff_info[bonus.lower() + "_value"] = bonus_data["MaxHQ" if hq else "Max"]

    return buff_info


def page_generator(url: str, prog: tqdm):
    page_next = 1
    while True:
        time.sleep(REQ_DELAY)

        resp = requests.get(url, params={"Page": page_next})

        resp_data = resp.json()
        yield resp_data

        if (
            resp_data["Pagination"]["PageTotal"] > 1
            and resp_data["Pagination"]["Page"] == 1
        ):
            prog.total += resp_data["Pagination"]["PageTotal"] - 1

        if resp_data["Pagination"]["PageNext"] is None:
            break

        page_next = resp_data["Pagination"]["PageNext"]


def main():
    food_id_url = "https://xivapi.com/search?filters=ItemSearchCategoryTargetID=45,{}&indexes=Item"
    potion_id_url = "https://xivapi.com/search?filters=ItemSearchCategoryTargetID=43,{}&indexes=Item"

    food_ids: set[int] = set()
    potion_ids: set[int] = set()

    prog = tqdm(desc="Fetching IDs", total=6)
    for bonus in {"Bonuses.Control", "Bonuses.CP", "Bonuses.Craftsmanship"}:
        for page in page_generator(food_id_url.format(bonus + "!"), prog):
            food_ids.update(f["ID"] for f in page["Results"])
            prog.update()

        for page in page_generator(potion_id_url.format(bonus + "!"), prog):
            potion_ids.update(f["ID"] for f in page["Results"])
            prog.update()

    item_url = "https://xivapi.com/Item/{}"

    foods: list[dict] = list()
    for food_id in tqdm(food_ids, desc="Foods"):
        time.sleep(REQ_DELAY)

        resp = requests.get(item_url.format(food_id))
        foods.append(item_to_buff(resp.json()))
        foods.append(item_to_buff(resp.json(), True))

    potions: list[dict] = list()
    for potion_id in tqdm(potion_ids, desc="Potions"):
        time.sleep(REQ_DELAY)

        resp = requests.get(item_url.format(potion_id))
        potions.append(item_to_buff(resp.json()))
        potions.append(item_to_buff(resp.json(), True))

    key_func = lambda i: i["name"]["en"]
    with open("Meal.json", "w") as f:
        json.dump(sorted(foods, key=key_func), f, indent=2)

    with open("Medicine.json", "w") as f:
        json.dump(sorted(potions, key=key_func), f, indent=2)


if __name__ == "__main__":
    main()
