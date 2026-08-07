DELETE FROM MenuItemCupSizeMap
WHERE rowid NOT IN (
    SELECT MAX(rowid)
    FROM MenuItemCupSizeMap
    GROUP BY menu_item_id
);

DELETE FROM MenuCategoryCupSizeMap
WHERE rowid NOT IN (
    SELECT MAX(rowid)
    FROM MenuCategoryCupSizeMap
    GROUP BY menu_category_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_item_single_cup_size
ON MenuItemCupSizeMap(menu_item_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_category_single_cup_size
ON MenuCategoryCupSizeMap(menu_category_id);