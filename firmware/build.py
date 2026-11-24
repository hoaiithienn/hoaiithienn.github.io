"""Assemble both firmware fixtures and extract the relocation-free firmware ROM from ELF .text."""
import os
from pathlib import Path
import struct
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
output = root / "public/firmware"
output.mkdir(parents=True, exist_ok=True)


def firmware_rom(obj):
    header = struct.unpack_from("<16sHHIIIIIHHHHHH", obj)
    assert header[0][:6] == b"\x7fELF\x01\x01"
    section_table, entry_size, count, names_index = (
        header[6], header[11], header[12], header[13]
    )
    sections = [
        struct.unpack_from("<10I", obj, section_table + index * entry_size)
        for index in range(count)
    ]
    names = sections[names_index][4]
    rom = b""
    for name, kind, _, _, offset, length, *_ in sections:
        if kind in (4, 9):
            raise ValueError("Firmware ROM contains unresolved relocations")
        if obj[names + name:].split(b"\0", 1)[0] == b".text":
            rom = obj[offset:offset + length]
    if len(rom) != 65536 or rom[0xfff0:0xfff5] != b"\xea\x00\x00\x00\xf0":
        raise ValueError("Invalid PC firmware ROM")
    return rom


with tempfile.TemporaryDirectory() as temp:
    obj = Path(temp) / "boot.o"
    for image, flags in [("baseline", []), ("regression", ["-DREGRESSION"])]:
        subprocess.run([
            os.environ.get("CLANG", "clang"), "--target=i386-none-elf",
            *flags, "-c", str(root / "firmware/boot.S"), "-o", str(obj),
        ], check=True)
        (output / f"{image}.rom").write_bytes(firmware_rom(obj.read_bytes()))
