class MockDict:
    """A mock dictionary that can be used like a namespace and supports dict operations."""

    def __init__(self, *args, **kwargs):
        self._dict = dict(*args, **kwargs)
        # Initialize audio_cache for session state
        if "audio_cache" not in self._dict:
            self._dict["audio_cache"] = {}

    def __getattr__(self, name):
        return self._dict.get(name)

    def __setattr__(self, name, value):
        if name == "_dict":
            super().__setattr__(name, value)
        else:
            self._dict[name] = value

    def get(self, key, default=None):
        return self._dict.get(key, default)

    def __getitem__(self, key):
        return self._dict[key]

    def __setitem__(self, key, value):
        self._dict[key] = value

    def __contains__(self, key):
        return key in self._dict


def new_dict(*args, **kwargs):
    """Helper function to create a new dict that can be used like a namespace"""
    return MockDict(*args, **kwargs)
