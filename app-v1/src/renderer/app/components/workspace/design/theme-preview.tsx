import { SHADE_STEPS, themeFontLinks, themeToCss, themeToStyle, type Theme } from "@supergrid/theme";
import { ArrowRightIcon, BellIcon, CheckIcon, ChevronRightIcon, InfoIcon, MailIcon, SearchIcon, SparklesIcon, StarIcon } from "lucide-react";
import * as React from "react";
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "~/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card as KitCard, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle, DialogTrigger } from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { Progress, ProgressIndicator, ProgressTrack } from "~/components/ui/progress";
import { Radio, RadioGroup } from "~/components/ui/radio-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
import { Switch } from "~/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

// The preview: the base-ui kit rendered inside a scope that carries the theme's variables. The
// components are the app's own, untouched; only the variables around them change, which is the
// whole point: a theme is runtime data.

/** Loads the theme's web fonts into this document once per stylesheet. */
function useThemeFonts(theme: Theme) {
  React.useEffect(() => {
    for (const href of themeFontLinks(theme)) {
      if (document.querySelector(`link[data-sg-font][href="${CSS.escape(href)}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.sgFont = "";
      document.head.appendChild(link);
    }
  }, [theme]);
}

/** A themed region: the variables on a div, the kit inside. */
export function ThemeScope({ theme, className, children, style }: { theme: Theme; className?: string; children: React.ReactNode; style?: React.CSSProperties }): React.ReactElement {
  useThemeFonts(theme);
  const vars = React.useMemo(() => themeToStyle(theme) as React.CSSProperties, [theme]);
  return (
    <div data-sg-theme={theme.id} className={cn(theme.mode === "dark" ? "dark" : "light", "bg-background font-sans text-foreground antialiased", className)} style={{ ...vars, ...style }}>
      {children}
    </div>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h3 className="font-accent text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

const rows = [
  { name: "Lena Hart", email: "lena@example.com", plan: "Pro", status: "Active" },
  { name: "Marco Díaz", email: "marco@studio.io", plan: "Team", status: "Trial" },
  { name: "Ola Berg", email: "ola@north.se", plan: "Free", status: "Paused" },
];

/** Every kind of component, once. */
export function KitPreview({ theme }: { theme: Theme }): React.ReactElement {
  const ramps = ["primary", "secondary", "accent", "neutral", ...Object.keys(theme.colors.custom ?? {})];
  return (
    <div className="flex flex-col gap-8 p-6">
      <Section title="Type">
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight">The quick brown fox jumps over the lazy dog</h1>
        <h2 className="font-heading text-2xl font-semibold">A second-level heading</h2>
        <p className="max-w-prose text-base text-foreground">Body text in {theme.fonts.body.family}. Pack my box with five dozen liquor jugs, and <a className="text-primary underline underline-offset-4">a link</a> to go with it.</p>
        <p className="font-accent text-lg text-muted-foreground">An accent line in {theme.fonts.accent?.family ?? theme.fonts.heading.family}.</p>
        <code className="w-fit rounded-md bg-muted px-2 py-1 font-mono text-sm">const theme = await workspace.readTheme();</code>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Delete</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Saving</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon" aria-label="Star"><StarIcon /></Button>
          <Button variant="outline" size="icon" aria-label="Notifications"><BellIcon /></Button>
          <Button>
            <SparklesIcon />
            With icon
          </Button>
        </div>
      </Section>

      <Section title="Badges and status">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Alert variant="info">
            <InfoIcon />
            <AlertTitle>A note</AlertTitle>
            <AlertDescription>Themes apply at runtime: save and every page picks it up on its next load.</AlertDescription>
          </Alert>
          <Alert variant="success">
            <CheckIcon />
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>The theme is now the default for this workspace.</AlertDescription>
          </Alert>
        </div>
      </Section>

      <Section title="Forms">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input placeholder="you@example.com" type="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Search</Label>
            <Input placeholder="Search contacts" type="search" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Plan</Label>
            <Select defaultValue="pro">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectPopup>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectPopup>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Volume</Label>
            <Slider defaultValue={40} className="pt-2" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Message</Label>
            <Textarea placeholder="Say something nice" rows={2} />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label className="flex items-center gap-2"><Checkbox defaultChecked /> Send me updates</Label>
            <Label className="flex items-center gap-2"><Checkbox /> Remember this device</Label>
            <Label className="flex items-center gap-2"><Switch defaultChecked /> Notifications</Label>
          </div>
          <RadioGroup defaultValue="monthly" className="flex flex-col gap-2.5">
            <Label className="flex items-center gap-2"><Radio value="monthly" /> Monthly</Label>
            <Label className="flex items-center gap-2"><Radio value="yearly" /> Yearly, two months free</Label>
          </RadioGroup>
        </div>
      </Section>

      <Section title="Navigation">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTab value="overview">Overview</TabsTab>
            <TabsTab value="activity">Activity</TabsTab>
            <TabsTab value="settings">Settings</TabsTab>
          </TabsList>
          <TabsPanel value="overview" className="text-sm text-muted-foreground">Overview content.</TabsPanel>
          <TabsPanel value="activity" className="text-sm text-muted-foreground">Activity content.</TabsPanel>
          <TabsPanel value="settings" className="text-sm text-muted-foreground">Settings content.</TabsPanel>
        </Tabs>
        <Tabs defaultValue="a">
          <TabsList variant="underline">
            <TabsTab value="a">Pages</TabsTab>
            <TabsTab value="b">Media</TabsTab>
            <TabsTab value="c">Design</TabsTab>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Tooltip>
            <TooltipTrigger render={<Button variant="outline" size="sm" />}>Hover me</TooltipTrigger>
            <TooltipPopup>A tooltip</TooltipPopup>
          </Tooltip>
          <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>Open dialog</DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>Publish this theme?</DialogTitle>
                <DialogDescription>Every app in the workspace will use it on its next load.</DialogDescription>
              </DialogHeader>
              <DialogPanel className="text-sm text-muted-foreground">Dialogs, popovers and menus take the popover surface and the theme radius.</DialogPanel>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <DialogClose render={<Button />}>Publish</DialogClose>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
          <span className="flex items-center gap-1 text-muted-foreground">
            Press <Kbd>⌘</Kbd><Kbd>K</Kbd>
          </span>
        </div>
      </Section>

      <Section title="Cards and data">
        <div className="grid gap-4 sm:grid-cols-2">
          <KitCard>
            <CardHeader>
              <CardTitle>Monthly visitors</CardTitle>
              <CardDescription>Compared with last month.</CardDescription>
            </CardHeader>
            <CardPanel>
              <div className="font-heading text-3xl font-bold">24,310</div>
              <Progress value={64} className="mt-3">
                <ProgressTrack><ProgressIndicator /></ProgressTrack>
              </Progress>
            </CardPanel>
            <CardFooter className="text-sm text-muted-foreground">64% of the goal</CardFooter>
          </KitCard>
          <KitCard>
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <CardDescription>People with access.</CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-3">
              {[["LH", "Lena Hart", "Owner"], ["MD", "Marco Díaz", "Editor"]].map(([i, n, r]) => (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <Avatar className="[--avatar-size:--spacing(8)]"><AvatarFallback className="text-[11px]">{i}</AvatarFallback></Avatar>
                  <span className="flex-1 font-medium">{n}</span>
                  <Badge variant="outline" size="sm">{r}</Badge>
                </div>
              ))}
              <Skeleton className="h-8 w-full" />
            </CardPanel>
          </KitCard>
        </div>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.email}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground">{r.email}</TableCell>
                  <TableCell>{r.plan}</TableCell>
                  <TableCell className="text-right"><Badge variant={r.status === "Active" ? "success" : r.status === "Trial" ? "info" : "warning"} size="sm">{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Accordion>
          <AccordionItem>
            <AccordionTrigger>How do themes reach an app?</AccordionTrigger>
            <AccordionPanel>Through one stylesheet the workspace serves, or the document over RPC.</AccordionPanel>
          </AccordionItem>
          <AccordionItem>
            <AccordionTrigger>Can an app change the components?</AccordionTrigger>
            <AccordionPanel>Yes: the kit is copied in, so an app owns its copy and can add to it. The theme keeps working as long as the variables are read.</AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Color ramps">
        <div className="flex flex-col gap-2">
          {ramps.map((name) => (
            <div key={name} className="flex items-center gap-3 text-xs">
              <span className="w-20 shrink-0 font-mono text-muted-foreground">{name}</span>
              <div className="flex flex-1 overflow-hidden rounded-md">
                {SHADE_STEPS.map((s) => (
                  <span key={s} className="h-7 flex-1" style={{ background: `var(--sg-${name}-${s})` }} title={`--sg-${name}-${s}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <Separator />
        <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
          {[["background", "Background"], ["muted", "Muted"], ["border", "Border"], ["primary", "Primary"], ["secondary", "Secondary"], ["accent", "Accent"]].map(([v, l]) => (
            <div key={v} className="flex flex-col gap-1">
              <span className="h-9 rounded-md border" style={{ background: `var(--${v})` }} />
              <span className="text-muted-foreground">{l}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/** A sample page, so a theme is judged on a real-looking site and not only on parts. */
export function SitePreview({ theme, name }: { theme: Theme; name: string }): React.ReactElement {
  const logo = theme.mode === "dark" ? (theme.assets.logoDark ?? theme.assets.logo) : theme.assets.logo;
  return (
    <div className="flex flex-col">
      <header className="flex items-center gap-6 border-b px-6 py-3 text-sm">
        <span className="flex items-center gap-2 font-heading text-base font-bold">
          {logo ? <img src={logo} alt="" className="h-6 w-auto max-w-32 object-contain" /> : <span className="size-5 rounded-md bg-primary" />}
          {!logo && name}
        </span>
        <nav className="hidden items-center gap-4 text-muted-foreground sm:flex">
          <span className="text-foreground">Work</span>
          <span>Pricing</span>
          <span>Blog</span>
        </nav>
        <span className="flex-1" />
        <Button variant="ghost" size="sm">Sign in</Button>
        <Button size="sm">Get started</Button>
      </header>
      <section className="flex flex-col items-start gap-5 px-6 py-14">
        <Badge variant="secondary" size="lg">New this spring</Badge>
        <h1 className="max-w-2xl font-heading text-5xl font-bold leading-[1.05] tracking-tight">Make something people come back to.</h1>
        <p className="max-w-xl font-accent text-lg text-muted-foreground">Sites, funnels and forms for {name}, all on one theme. Change a color here and every page follows.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="lg">
            Start free
            <ArrowRightIcon />
          </Button>
          <Button size="lg" variant="outline">See pricing</Button>
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex -space-x-2">
            {["A", "B", "C"].map((i) => (
              <Avatar key={i} className="border-2 border-background [--avatar-size:--spacing(7)]"><AvatarFallback className="text-[10px]">{i}</AvatarFallback></Avatar>
            ))}
          </span>
          Trusted by 2,400 teams
        </div>
      </section>
      <section className="grid gap-4 border-t bg-muted/40 px-6 py-10 sm:grid-cols-3">
        {[["Pages", "Publish a page in minutes, on your own domain."], ["Funnels", "Offers, checkout and thank-you pages under one mount."], ["Forms", "One question at a time; every answer becomes a contact."]].map(([t, d]) => (
          <KitCard key={t}>
            <CardHeader>
              <span className="mb-2 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><SparklesIcon className="size-4" /></span>
              <CardTitle>{t}</CardTitle>
              <CardDescription>{d}</CardDescription>
            </CardHeader>
            <CardFooter>
              <span className="flex items-center gap-1 text-sm font-medium text-primary">Learn more <ChevronRightIcon className="size-4" /></span>
            </CardFooter>
          </KitCard>
        ))}
      </section>
      <section className="grid gap-8 border-t px-6 py-12 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-3xl font-semibold">Stay in the loop</h2>
          <p className="text-muted-foreground">A short note when something ships. No noise.</p>
          <blockquote className="mt-2 border-l-2 border-accent pl-4 font-accent text-lg">“The first tool that let our client change their own brand without a redeploy.”</blockquote>
          <span className="text-sm text-muted-foreground">Priya, Acme Studio</span>
        </div>
        <KitCard>
          <CardPanel className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>What are you building?</Label>
              <Select defaultValue="site">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectPopup>
                  <SelectItem value="site">A site</SelectItem>
                  <SelectItem value="shop">A shop</SelectItem>
                  <SelectItem value="app">An app</SelectItem>
                </SelectPopup>
              </Select>
            </div>
            <Label className="flex items-center gap-2 text-sm"><Checkbox defaultChecked /> Send me the monthly letter</Label>
            <Button className="mt-1">
              <MailIcon />
              Subscribe
            </Button>
          </CardPanel>
        </KitCard>
      </section>
      <footer className="flex flex-wrap items-center gap-4 border-t px-6 py-5 text-xs text-muted-foreground">
        <span className="font-heading font-semibold text-foreground">{name}</span>
        <span>Privacy</span>
        <span>Terms</span>
        <span className="flex-1" />
        <span className="flex items-center gap-1"><SearchIcon className="size-3" /> Search</span>
      </footer>
    </div>
  );
}

/** The generated stylesheet, so what the apps load is never a mystery. */
export function TokensPreview({ theme }: { theme: Theme }): React.ReactElement {
  const css = React.useMemo(() => themeToCss(theme), [theme]);
  return (
    <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-foreground">
      <code>{css}</code>
    </pre>
  );
}
