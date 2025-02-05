let upstream = https://github.com/dfinity/vessel-package-set/releases/download/mo-0.8.7-20230406/package-set.dhall

let Package =
    { name : Text, version : Text, repo : Text, dependencies : List Text }

let additions = [
  { name = "base"
  , repo = "https://github.com/dfinity/motoko-base"
  , version = "moc-0.8.7"
  , dependencies = [] : List Text
  }
] : List Package

in  upstream # additions
