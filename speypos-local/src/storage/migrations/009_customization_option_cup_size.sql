ALTER TABLE CustomizationOption
ADD COLUMN cup_size_id TEXT REFERENCES CupSize(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customization_option_cup_size
ON CustomizationOption(cup_size_id);
