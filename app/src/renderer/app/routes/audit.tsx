import { PageFrame } from "~/components/page-frame";
import { PageHeader } from "~/components/page-header";
import { CardFrame } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { audit } from "~/lib/mock";

export default function Audit() {
  return (
    <PageFrame crumbs={[{ label: "Home", to: "/" }, { label: "Audit log" }]}>
      <PageHeader title="Audit log" description="Everything done through the platform or the CLI, under the name of whoever did it." />
      <CardFrame>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Who</TableHead>
              <TableHead>What</TableHead>
              <TableHead className="max-md:hidden">Where</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audit.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.who}</TableCell>
                <TableCell>{a.what}</TableCell>
                <TableCell className="text-muted-foreground max-md:hidden">{a.where}</TableCell>
                <TableCell className="text-right text-muted-foreground">{a.when}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardFrame>
    </PageFrame>
  );
}
