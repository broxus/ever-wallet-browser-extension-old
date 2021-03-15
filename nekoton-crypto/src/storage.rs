pub trait KvStorage {
    type Error;
    fn get_by_key(key: &str) -> Result<String, Self::Error>;
    fn set(key: &str, value: &str) -> Result<(), Self::Error>;
}
