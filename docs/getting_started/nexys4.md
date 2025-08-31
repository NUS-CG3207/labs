# Getting to know your Nexys 4 board

!!! info

 This page is required reading before, or immediately after, receiving your Nexys 4 or Nexys 4 DDR FPGA board. 

In this course, you will use a Field Programmable Gate Array (FPGA) development board to learn digital design. We will loan you Nexys 4 boards; emails will be sent to inform you on how to collect the kits.

Here is the Digilent reference page for your [Nexys 4](https://digilent.com/reference/programmable-logic/nexys-4/start), or [Nexys 4 DDR](https://digilent.com/reference/programmable-logic/nexys-4-ddr/start). You can learn more about the specifications of the boards, and download relevant files.

## Getting familiar with the board

The large chip at the center of your board is the FPGA itself. It is the main component of the board, and indeed, the reason why it costs as much as it does. You will learn what an FPGA is in the first lab session.

The Nexys 4 boards come with a wide array of peripherals you can use to do all sorts of cool things. The simplest, and the ones we will use in this course, are the 7-segment displays (below the FPGA chip). Below the 7-segment display is an array of 16 LEDs, and below that, in turn, is an array of 16 switches. To the right of the FPGA, there are five black and two red push buttons. The black ones are designed to be general-purpose, and we can use them as inputs in our designs. The red buttons are meant to be used to reset the FPGA or a CPU design on it.

The Nexys 4 uses a micro USB connector on the top left of the board, for power, programming, and USB UART interfacing. The kits include a black cable to connect the board to your computer. It also includes a variety of other ports and connectors such as an RJ45 Ethernet jack, a VGA port and a USB port for peripherals like keyboards.

!!! tip
 If you own a computer with only USB-C ports, then you will need an adapter. Remember to bring one with you to the labs.

The single switch at the top left of your board, between the power connector and the full-sized USB-A port, is a power switch. Slide it up to turn the board on.

## Board Handling Guidelines

Like most development boards and PCBs, your FPGA board is fragile. Treat it with care and respect, as if it were your own. It is reasonably expensive at over S$500, and not so easy to get replaced.

Here are some tips to take good care of your board:

* **Do not touch the PCB tracks, or the components on the board**. Static discharge can damage or destroy electronic components, and these boards can be particularly susceptible.
* **Use the nice plastic box with foam lining to transport your FPGA board**. Do not use a plastic bag or other plastic container to carry your boards, and most certainly don't put it bare in your backpack/tote/briefcase/whatever you bring to class.
* When using the board, **keep it on a stable, flat surface**. Do NOT have it hanging off the USB cable, or hanging off the edge of a table, or on your lap, or anywhere that isn't a suitable, solid surface.
* Absolutely **DO NOT DROP your board**. When moving it around, **hold the board by the edges** and **make sure the USB cable is unplugged** so as to minimize strain on the port and to avoid it getting caught on something.
* **Avoid plugging and unplugging the micro-USB cable** more than necessary. To reset the board, you can use the power switch on the top left of the board, or unplug the USB-A connector from your computer if really necessary. Micro USB is a notoriously fragile connector, and it's best to avoid putting more strain on it than necessary. USB-A is much sturdier so that end of the cable is not as much of a concern.
* Apply common sense and standard practices for taking care of electronics: don't eat or drink near your board in case you get crumbs (or worse, a spill) on the board. Don't throw the board around. Plug and unplug accessories with care. Be gentle when using the switches and buttons.
