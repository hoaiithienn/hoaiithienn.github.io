/* ROM firmware for the emulated PC. Writes newline-delimited events to COM1. */
.code16
.text
start:
    cli
    xorw %ax, %ax
    movw %ax, %ss
    movw $0x7c00, %sp
    pushw %cs
    popw %ds
    cld

    movw $0x3fb, %dx
    movb $0x80, %al
    outb %al, %dx
    movw $0x3f8, %dx
    movb $1, %al
    outb %al, %dx
    incw %dx
    xorb %al, %al
    outb %al, %dx
    movw $0x3fb, %dx
    movb $3, %al
    outb %al, %dx

    movw $(events - start), %si
next_byte:
    lodsb
    testb %al, %al
    jz idle
    movb %al, %cl
    movw $0x3fd, %dx
wait_uart:
    inb %dx, %al
    testb $0x20, %al
    jz wait_uart
    movw $0x3f8, %dx
    movb %cl, %al
    outb %al, %dx
    jmp next_byte
idle:
    hlt
    jmp idle
events:
#ifdef REGRESSION
    .asciz "BOOT_START\nREADY\nINIT_OK\nBOOT_END\n"
#else
    .asciz "BOOT_START\nINIT_OK\nREADY\nBOOT_END\n"
#endif
/* The x86 reset vector is 16 bytes below the end of the ROM. */
.org 0xfff0
ljmp $0xf000, $0
.org 0x10000
