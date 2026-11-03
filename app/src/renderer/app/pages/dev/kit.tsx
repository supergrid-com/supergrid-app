import { AlignCenterIcon, AlignLeftIcon, AlignRightIcon, BoldIcon, CircleAlertIcon, CircleCheckIcon, CopyIcon, DownloadIcon, InfoIcon, ItalicIcon, PencilIcon, PlusIcon, SearchIcon, SettingsIcon, Trash2Icon, TriangleAlertIcon, UnderlineIcon } from "lucide-react";
import * as React from "react";
import { Shimmer } from "~/components/shimmer";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle, AlertDialogTrigger } from "~/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { ColorDots, ColorPicker, ColorPickerPanel } from "~/components/ui/color-picker";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "~/components/ui/collapsible";
import { ContextMenu, ContextMenuItem, ContextMenuPopup, ContextMenuSeparator, ContextMenuShortcut, ContextMenuTrigger } from "~/components/ui/context-menu";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "~/components/ui/input-group";
import { Kbd, KbdGroup } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { Menu, MenuCheckboxItem, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuShortcut, MenuSub, MenuSubPopup, MenuSubTrigger, MenuTrigger } from "~/components/ui/menu";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "~/components/ui/meter";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "~/components/ui/number-field";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "~/components/ui/pagination";
import { Popover, PopoverDescription, PopoverPopup, PopoverTitle, PopoverTrigger } from "~/components/ui/popover";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack, ProgressValue } from "~/components/ui/progress";
import { Radio, RadioGroup } from "~/components/ui/radio-group";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetTrigger } from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { Toggle } from "~/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator } from "~/components/ui/toolbar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { accents } from "~/lib/accent";
import { Specimen, Variants } from "./specimen";

// The coss/ui kit (components/ui), one page per group, every variant and state side by side.

const buttonVariants = ["default", "secondary", "outline", "ghost", "destructive", "destructive-outline", "link"] as const;
const buttonSizes = ["xs", "sm", "default", "lg", "xl"] as const;
const iconSizes = ["icon-xs", "icon-sm", "icon", "icon-lg", "icon-xl"] as const;

export function Buttons(): React.ReactElement {
  return (
    <>
      <Specimen title="Variants">
        {buttonVariants.map((v) => (
          <Variants key={v} label={v}>
            <Button variant={v}>Save Changes</Button>
            <Button variant={v}>
              <PlusIcon />
              New Table
            </Button>
            <Button variant={v} size="icon" aria-label="Settings">
              <SettingsIcon />
            </Button>
            <Button variant={v} disabled>
              Disabled
            </Button>
            <Button variant={v} loading>
              Loading
            </Button>
          </Variants>
        ))}
      </Specimen>
      <Specimen title="Sizes">
        {buttonSizes.map((s) => (
          <Variants key={s} label={`size="${s}"`}>
            <Button size={s}>Deploy</Button>
            <Button size={s} variant="outline">
              <DownloadIcon />
              Export
            </Button>
            <Button size={s} variant="ghost">
              Cancel
            </Button>
          </Variants>
        ))}
        <Variants label="icon sizes">
          {iconSizes.map((s) => (
            <Button key={s} size={s} variant="outline" aria-label={s}>
              <PencilIcon />
            </Button>
          ))}
        </Variants>
      </Specimen>
      <Specimen title="Toggles">
        <Variants label="Toggle">
          <Toggle aria-label="Bold">
            <BoldIcon />
          </Toggle>
          <Toggle aria-label="Italic" defaultPressed>
            <ItalicIcon />
          </Toggle>
          <Toggle variant="outline" aria-label="Underline">
            <UnderlineIcon />
          </Toggle>
          <Toggle variant="outline" defaultPressed>
            Pressed
          </Toggle>
        </Variants>
        <Variants label="ToggleGroup">
          <ToggleGroup defaultValue={["left"]}>
            <ToggleGroupItem value="left" aria-label="Left">
              <AlignLeftIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Center">
              <AlignCenterIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Right">
              <AlignRightIcon />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup variant="outline" defaultValue={["center"]}>
            <ToggleGroupItem value="left" aria-label="Left">
              <AlignLeftIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Center">
              <AlignCenterIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Right">
              <AlignRightIcon />
            </ToggleGroupItem>
          </ToggleGroup>
        </Variants>
        <Variants label="Toolbar">
          <Toolbar>
            <ToolbarGroup>
              <ToolbarButton render={<Button variant="ghost" size="icon-sm" aria-label="Copy" />}>
                <CopyIcon />
              </ToolbarButton>
              <ToolbarButton render={<Button variant="ghost" size="icon-sm" aria-label="Edit" />}>
                <PencilIcon />
              </ToolbarButton>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <ToolbarButton render={<Button variant="ghost" size="icon-sm" aria-label="Delete" />}>
                <Trash2Icon />
              </ToolbarButton>
            </ToolbarGroup>
          </Toolbar>
        </Variants>
      </Specimen>
    </>
  );
}

const accentPalette = accents.map((a) => a.color);

function ColorPickerSample(): React.ReactElement {
  const [color, setColor] = React.useState("#e8604a");
  return (
    <>
      <Variants label="ColorPicker">
        <ColorPicker label="Accent" value={color} palette={accentPalette} onChange={setColor} />
      </Variants>
      <Variants label="ColorDots">
        <ColorDots colors={accentPalette} value={color} onChange={setColor} />
      </Variants>
      <Variants label="Panel" className="items-start">
        <div className="rounded-xl border bg-card p-3">
          <ColorPickerPanel value={color} palette={accentPalette} onChange={setColor} />
        </div>
      </Variants>
    </>
  );
}

export function Inputs(): React.ReactElement {
  return (
    <>
      <Specimen title="Input">
        <Variants label="sizes" className="grid max-w-xl grid-cols-1 sm:grid-cols-3">
          <Input size="sm" placeholder="Small" aria-label="Small" />
          <Input placeholder="Default" aria-label="Default" />
          <Input size="lg" placeholder="Large" aria-label="Large" />
        </Variants>
        <Variants label="states" className="grid max-w-xl grid-cols-1 sm:grid-cols-3">
          <Input defaultValue="sg-ws-bcd463" aria-label="Filled" />
          <Input defaultValue="not a url" aria-invalid aria-label="Invalid" />
          <Input placeholder="Disabled" disabled aria-label="Disabled" />
        </Variants>
      </Specimen>
      <Specimen title="Input Group">
        <div className="grid max-w-xl gap-3">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search tables, rows and apps" aria-label="Search" />
            <InputGroupAddon align="inline-end">
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>https://</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput placeholder="shop.example.com" aria-label="Domain" />
            <InputGroupAddon align="inline-end">
              <Button size="xs" variant="ghost">
                Check
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Specimen>
      <Specimen title="Textarea">
        <Textarea className="max-w-xl" placeholder="Notes about this contact" aria-label="Notes" />
      </Specimen>
      <Specimen title="Color Picker" about="react-beautiful-color's pieces in the kit's clothes, with the core colors as dots.">
        <ColorPickerSample />
      </Specimen>
      <Specimen title="Number Field">
        <NumberField defaultValue={3} min={0} className="w-40" aria-label="Quantity">
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      </Specimen>
      <Specimen title="Field" about="A label, the control, then a description or an error.">
        <div className="grid max-w-xl gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel>Workspace name</FieldLabel>
            <Input defaultValue="Acme store" />
            <FieldDescription>Shown in the rail and the switcher.</FieldDescription>
          </Field>
          <Field invalid>
            <FieldLabel>Prefix</FieldLabel>
            <Input defaultValue="SG WS" aria-invalid />
            <FieldError match>Lowercase letters, digits and dashes only.</FieldError>
          </Field>
        </div>
      </Specimen>
    </>
  );
}

const regions = [
  { label: "Western Europe", value: "weur" },
  { label: "Eastern North America", value: "enam" },
  { label: "Asia Pacific", value: "apac" },
];

export function Selection(): React.ReactElement {
  return (
    <>
      <Specimen title="Checkbox">
        <Variants label="states">
          <Label>
            <Checkbox /> Unchecked
          </Label>
          <Label>
            <Checkbox defaultChecked /> Checked
          </Label>
          <Label>
            <Checkbox indeterminate /> Indeterminate
          </Label>
          <Label>
            <Checkbox disabled /> Disabled
          </Label>
          <Label>
            <Checkbox aria-invalid /> Invalid
          </Label>
        </Variants>
      </Specimen>
      <Specimen title="Radio Group">
        <RadioGroup defaultValue="editor" className="gap-2">
          {["owner", "admin", "editor", "viewer"].map((r) => (
            <Label key={r} className="capitalize">
              <Radio value={r} /> {r}
            </Label>
          ))}
        </RadioGroup>
      </Specimen>
      <Specimen title="Switch">
        <Variants label="states">
          <Label>
            <Switch /> Off
          </Label>
          <Label>
            <Switch defaultChecked /> On
          </Label>
          <Label>
            <Switch disabled /> Disabled
          </Label>
        </Variants>
      </Specimen>
      <Specimen title="Select">
        <Variants label="sizes">
          {(["sm", "default", "lg"] as const).map((s) => (
            <Select key={s} items={regions} defaultValue="weur">
              <SelectTrigger size={s} className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {regions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          ))}
        </Variants>
      </Specimen>
      <Specimen title="Slider">
        <div className="grid max-w-md gap-6">
          <Slider defaultValue={40} aria-label="Value" />
          <Slider defaultValue={[20, 70]} aria-label="Range" />
          <Slider defaultValue={60} disabled aria-label="Disabled" />
        </div>
      </Specimen>
    </>
  );
}

export function Overlays(): React.ReactElement {
  return (
    <>
      <Specimen title="Dialogs">
        <Variants label="Dialog">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>New Table</DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>New Table</DialogTitle>
                <DialogDescription>It starts with a name, notes and a created date.</DialogDescription>
              </DialogHeader>
              <DialogPanel>
                <Input autoFocus placeholder="Table name, like Bookings" aria-label="Table name" />
              </DialogPanel>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                <DialogClose render={<Button />}>Create Table</DialogClose>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        </Variants>
        <Variants label="AlertDialog">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive-outline" />}>Delete Workspace</AlertDialogTrigger>
            <AlertDialogPopup>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Acme store?</AlertDialogTitle>
                <AlertDialogDescription>Its Worker, database and apps go with it. This can't be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
                <AlertDialogClose render={<Button variant="destructive" />}>Delete</AlertDialogClose>
              </AlertDialogFooter>
            </AlertDialogPopup>
          </AlertDialog>
        </Variants>
        <Variants label="Sheet">
          {(["right", "left", "bottom"] as const).map((side) => (
            <Sheet key={side}>
              <SheetTrigger render={<Button variant="outline" />}>From the {side}</SheetTrigger>
              <SheetPopup side={side}>
                <SheetHeader>
                  <SheetTitle>Contact</SheetTitle>
                  <SheetDescription>One row, opened beside the grid.</SheetDescription>
                </SheetHeader>
                <SheetPanel>
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </SheetPanel>
                <SheetFooter>
                  <Button>Save</Button>
                </SheetFooter>
              </SheetPopup>
            </Sheet>
          ))}
        </Variants>
      </Specimen>
      <Specimen title="Popover and Tooltip">
        <Variants label="Popover">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" />}>Open Popover</PopoverTrigger>
            <PopoverPopup className="w-72">
              <PopoverTitle>Filter Rows</PopoverTitle>
              <PopoverDescription>Only rows that match every condition show.</PopoverDescription>
              <Input className="mt-3" placeholder="Status is…" aria-label="Condition" />
            </PopoverPopup>
          </Popover>
        </Variants>
        <Variants label="Tooltip">
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" />}>Hover Me</TooltipTrigger>
            <TooltipPopup>A tooltip</TooltipPopup>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Settings" />}>
              <SettingsIcon />
            </TooltipTrigger>
            <TooltipPopup>
              Settings <Kbd className="ms-1">⌘,</Kbd>
            </TooltipPopup>
          </Tooltip>
        </Variants>
      </Specimen>
      <Specimen title="Menus">
        <Variants label="Menu">
          <Menu>
            <MenuTrigger render={<Button variant="outline" />}>Open Menu</MenuTrigger>
            <MenuPopup className="w-56">
              <MenuGroup>
                <MenuGroupLabel>Row</MenuGroupLabel>
                <MenuItem>
                  <PencilIcon /> Edit <MenuShortcut>⌘E</MenuShortcut>
                </MenuItem>
                <MenuItem>
                  <CopyIcon /> Duplicate <MenuShortcut>⌘D</MenuShortcut>
                </MenuItem>
                <MenuItem disabled>
                  <DownloadIcon /> Export
                </MenuItem>
              </MenuGroup>
              <MenuSeparator />
              <MenuCheckboxItem defaultChecked>Show Hidden Fields</MenuCheckboxItem>
              <MenuCheckboxItem variant="switch">Wrap Cells</MenuCheckboxItem>
              <MenuSeparator />
              <MenuGroup>
                <MenuGroupLabel>Density</MenuGroupLabel>
                <MenuRadioGroup defaultValue="compact">
                  <MenuRadioItem value="compact">Compact</MenuRadioItem>
                  <MenuRadioItem value="comfortable">Comfortable</MenuRadioItem>
                </MenuRadioGroup>
              </MenuGroup>
              <MenuSeparator />
              <MenuSub>
                <MenuSubTrigger>Move To</MenuSubTrigger>
                <MenuSubPopup>
                  <MenuItem>Contacts</MenuItem>
                  <MenuItem>Companies</MenuItem>
                </MenuSubPopup>
              </MenuSub>
              <MenuSeparator />
              <MenuItem variant="destructive">
                <Trash2Icon /> Delete
              </MenuItem>
            </MenuPopup>
          </Menu>
        </Variants>
        <Variants label="ContextMenu">
          <ContextMenu>
            <ContextMenuTrigger className="flex h-24 w-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Right-click here</ContextMenuTrigger>
            <ContextMenuPopup className="w-48">
              <ContextMenuItem>
                Copy <ContextMenuShortcut>⌘C</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuItem>
                Paste <ContextMenuShortcut>⌘V</ContextMenuShortcut>
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem>Insert Row Above</ContextMenuItem>
            </ContextMenuPopup>
          </ContextMenu>
        </Variants>
      </Specimen>
    </>
  );
}

const alerts = [
  { variant: "default", icon: InfoIcon, title: "Heads Up", text: "The workspace updates when its apps do." },
  { variant: "info", icon: InfoIcon, title: "New Version", text: "Workspace 0.4.2 is ready to install." },
  { variant: "success", icon: CircleCheckIcon, title: "Deployed", text: "sg-ws-bcd463 is live on its new version." },
  { variant: "warning", icon: TriangleAlertIcon, title: "R2 is off", text: "Media uploads need R2 enabled on the account." },
  { variant: "error", icon: CircleAlertIcon, title: "Couldn't deploy", text: "wrangler isn't signed in on this machine." },
] as const;

const badgeVariants = ["default", "secondary", "outline", "info", "success", "warning", "error", "destructive"] as const;
const toastTypes = ["success", "info", "warning", "error", "loading"] as const;

export function Feedback(): React.ReactElement {
  return (
    <>
      <Specimen title="Alert">
        <div className="grid gap-3">
          {alerts.map((a) => (
            <Alert key={a.variant} variant={a.variant}>
              <a.icon />
              <AlertTitle>{a.title}</AlertTitle>
              <AlertDescription>{a.text}</AlertDescription>
            </Alert>
          ))}
        </div>
      </Specimen>
      <Specimen title="Toast" about="Fire one; they stack bottom right.">
        <Variants label="types">
          {toastTypes.map((t) => (
            <Button key={t} variant="outline" size="sm" onClick={() => toastManager.add({ title: `A ${t} toast`, description: "With a line of description under it.", type: t })}>
              {t}
            </Button>
          ))}
        </Variants>
      </Specimen>
      <Specimen title="Badge">
        {(["sm", "default", "lg"] as const).map((s) => (
          <Variants key={s} label={`size="${s}"`}>
            {badgeVariants.map((v) => (
              <Badge key={v} variant={v} size={s}>
                {v}
              </Badge>
            ))}
          </Variants>
        ))}
      </Specimen>
      <Specimen title="Progress and Meter">
        <div className="grid max-w-md gap-5">
          <Progress value={62}>
            <div className="flex items-center justify-between">
              <ProgressLabel>Uploading media</ProgressLabel>
              <ProgressValue />
            </div>
            <ProgressTrack>
              <ProgressIndicator />
            </ProgressTrack>
          </Progress>
          <Progress value={null} aria-label="Indeterminate" />
          <Meter value={38}>
            <div className="flex items-center justify-between">
              <MeterLabel>D1 storage</MeterLabel>
              <MeterValue />
            </div>
            <MeterTrack>
              <MeterIndicator />
            </MeterTrack>
          </Meter>
        </div>
      </Specimen>
      <Specimen title="Loading">
        <Variants label="Spinner">
          <Spinner className="size-4" />
          <Spinner className="size-5" />
          <Spinner className="size-6 text-muted-foreground" />
        </Variants>
        <Variants label="Shimmer">
          <Shimmer className="text-sm">Thinking about your tables</Shimmer>
        </Variants>
        <Variants label="Skeleton" className="max-w-md flex-col items-stretch">
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </Variants>
      </Specimen>
    </>
  );
}

export function Navigation(): React.ReactElement {
  const [seg, setSeg] = React.useState("grid");
  return (
    <>
      <Specimen title="Tabs">
        <Variants label="default">
          <Tabs defaultValue="rows" className="w-full max-w-md">
            <TabsList>
              <TabsTab value="rows">Rows</TabsTab>
              <TabsTab value="fields">Fields</TabsTab>
              <TabsTab value="views">Views</TabsTab>
            </TabsList>
            <TabsPanel value="rows" className="pt-3 text-sm text-muted-foreground">
              Every row in the table.
            </TabsPanel>
            <TabsPanel value="fields" className="pt-3 text-sm text-muted-foreground">
              The table's fields and their types.
            </TabsPanel>
            <TabsPanel value="views" className="pt-3 text-sm text-muted-foreground">
              Saved filters and sorts.
            </TabsPanel>
          </Tabs>
        </Variants>
        <Variants label="underline">
          <Tabs defaultValue="overview" className="w-full max-w-md">
            <TabsList variant="underline">
              <TabsTab value="overview">Overview</TabsTab>
              <TabsTab value="logs">Logs</TabsTab>
              <TabsTab value="settings">Settings</TabsTab>
            </TabsList>
          </Tabs>
        </Variants>
      </Specimen>
      <Specimen title="Segmented Control">
        {(["sm", "default", "lg"] as const).map((s) => (
          <Variants key={s} label={`size="${s}"`}>
            <SegmentedControl size={s} aria-label="View">
              {["grid", "list", "board"].map((v) => (
                <SegmentedControlItem key={v} aria-pressed={seg === v} data-pressed={seg === v || undefined} onClick={() => setSeg(v)} className="capitalize">
                  {v}
                </SegmentedControlItem>
              ))}
            </SegmentedControl>
          </Variants>
        ))}
      </Specimen>
      <Specimen title="Breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#breadcrumb">Acme store</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#breadcrumb">Database</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Contacts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Specimen>
      <Specimen title="Pagination">
        <Pagination className="justify-start">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#pagination" />
            </PaginationItem>
            {[1, 2, 3].map((n) => (
              <PaginationItem key={n}>
                <PaginationLink href="#pagination" isActive={n === 2}>
                  {n}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#pagination" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Specimen>
      <Specimen title="Keys">
        <Variants label="Kbd">
          <Kbd>⌘</Kbd>
          <Kbd>Esc</Kbd>
          <KbdGroup>
            <Kbd>⌘</Kbd>
            <Kbd>⇧</Kbd>
            <Kbd>P</Kbd>
          </KbdGroup>
        </Variants>
      </Specimen>
    </>
  );
}

const people = [
  { name: "Dana Reyes", email: "dana@acme.test", role: "Owner", status: "success" },
  { name: "Sam Okafor", email: "sam@acme.test", role: "Admin", status: "success" },
  { name: "Lee Park", email: "lee@acme.test", role: "Editor", status: "warning" },
  { name: "Ari Novak", email: "ari@acme.test", role: "Viewer", status: "secondary" },
] as const;

const initials = (n: string) =>
  n
    .split(" ")
    .map((p) => p[0])
    .join("");

export function Display(): React.ReactElement {
  return (
    <>
      <Specimen title="Card" canvas="none">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>sg-ws-bcd463 in the SuperGrid account.</CardDescription>
            </CardHeader>
            <CardPanel>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-mono">0.4.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Apps</span>
                  <span>3</span>
                </div>
              </div>
            </CardPanel>
            <CardFooter>
              <Button size="sm" variant="outline">
                Check for Updates
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Who can open this organization.</CardDescription>
            </CardHeader>
            <CardPanel>
              <div className="flex items-center gap-3">
                <AvatarGroup>
                  {people.map((p) => (
                    <Avatar key={p.name}>
                      <AvatarFallback>{initials(p.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                  <AvatarGroupCount>+3</AvatarGroupCount>
                </AvatarGroup>
              </div>
            </CardPanel>
          </Card>
        </div>
      </Specimen>
      <Specimen title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.map((p) => (
              <TableRow key={p.email}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <Avatar className="size-6 text-[10px]">
                      <AvatarFallback>{initials(p.name)}</AvatarFallback>
                    </Avatar>
                    {p.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                <TableCell>
                  <Badge variant={p.status}>{p.role}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Specimen>
      <Specimen title="Accordion and Collapsible">
        <Accordion className="max-w-xl">
          {["What is a workspace?", "Where does my data live?", "How do updates work?"].map((q) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionPanel>A Worker, a D1 database and its apps, all in your own Cloudflare account.</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
        <Collapsible className="max-w-xl">
          <CollapsibleTrigger render={<Button variant="ghost" size="sm" />}>Show Details</CollapsibleTrigger>
          <CollapsiblePanel>
            <p className="pt-2 text-sm text-muted-foreground">The details, folded until asked for.</p>
          </CollapsiblePanel>
        </Collapsible>
      </Specimen>
      <Specimen title="Avatar and Separator">
        <Variants label="Avatar">
          {["size-6 text-[10px]", "size-8", "size-10", "size-12 text-base"].map((c) => (
            <Avatar key={c} className={c}>
              <AvatarFallback>DR</AvatarFallback>
            </Avatar>
          ))}
        </Variants>
        <Variants label="Separator">
          <div className="flex h-6 items-center gap-3 text-sm">
            Rows
            <Separator orientation="vertical" />
            Fields
            <Separator orientation="vertical" />
            Views
          </div>
        </Variants>
      </Specimen>
    </>
  );
}
