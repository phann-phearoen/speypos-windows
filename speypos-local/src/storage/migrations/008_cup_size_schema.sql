CREATE TABLE IF NOT EXISTS CupSize (
    id TEXT PRIMARY KEY,
    size TEXT NOT NULL,
    unit TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS MenuItemCupSizeMap (
    id TEXT PRIMARY KEY,
    menu_item_id TEXT NOT NULL,
    cup_size_id TEXT NOT NULL,
    FOREIGN KEY (menu_item_id) REFERENCES MenuItem(id) ON DELETE CASCADE,
    FOREIGN KEY (cup_size_id) REFERENCES CupSize(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MenuCategoryCupSizeMap (
    id TEXT PRIMARY KEY,
    menu_category_id TEXT NOT NULL,
    cup_size_id TEXT NOT NULL,
    FOREIGN KEY (menu_category_id) REFERENCES MenuCategory(id) ON DELETE CASCADE,
    FOREIGN KEY (cup_size_id) REFERENCES CupSize(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cup_size_size_unit ON CupSize(size, unit);
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_item_cup_size_unique_pair ON MenuItemCupSizeMap(menu_item_id, cup_size_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_category_cup_size_unique_pair ON MenuCategoryCupSizeMap(menu_category_id, cup_size_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_cup_size_map_item ON MenuItemCupSizeMap(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_cup_size_map_size ON MenuItemCupSizeMap(cup_size_id);
CREATE INDEX IF NOT EXISTS idx_menu_category_cup_size_map_category ON MenuCategoryCupSizeMap(menu_category_id);
CREATE INDEX IF NOT EXISTS idx_menu_category_cup_size_map_size ON MenuCategoryCupSizeMap(cup_size_id);
